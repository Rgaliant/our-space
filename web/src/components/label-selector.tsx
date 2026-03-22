"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { LabelBadge } from "./label-badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Props {
  workspaceSlug: string;
  projectId: string;
  ticketId: string;
  workspaceLabels: Label[];
  currentLabels: Label[];
  onUpdate: (labels: Label[]) => void;
}

export function LabelSelector({ workspaceSlug, projectId, ticketId, workspaceLabels, currentLabels, onUpdate }: Props) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentLabels.map((l) => l.id)));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIds(new Set(currentLabels.map((l) => l.id)));
  }, [currentLabels]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function toggle(label: Label) {
    const next = new Set(selectedIds);
    if (next.has(label.id)) next.delete(label.id);
    else next.add(label.id);
    setSelectedIds(next);
    setSaving(true);
    const token = await getToken();
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}/labels`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ticket_labels: { label_ids: Array.from(next) } }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.data.labels ?? []);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border border-[#27272B] text-[#88889A] hover:border-[#3A3A42] hover:text-[#EDEDEF] disabled:opacity-50 transition-all"
      >
        <span>⬡</span>
        {currentLabels.length > 0 ? (
          <span className="flex items-center gap-1">
            {currentLabels.slice(0, 2).map((l) => (
              <LabelBadge key={l.id} label={l} size="xs" />
            ))}
            {currentLabels.length > 2 && (
              <span className="text-[#4A4A5A]">+{currentLabels.length - 2}</span>
            )}
          </span>
        ) : (
          <span>Labels</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-[#111114] border border-[#27272B] rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#27272B]">
            <p className="text-xs font-semibold text-[#88889A] uppercase tracking-wider">Labels</p>
          </div>
          {workspaceLabels.length === 0 ? (
            <p className="text-xs text-[#4A4A5A] px-3 py-3">No labels yet. Create them in Settings.</p>
          ) : (
            <ul className="py-1">
              {workspaceLabels.map((label) => {
                const selected = selectedIds.has(label.id);
                return (
                  <li key={label.id}>
                    <button
                      onClick={() => toggle(label)}
                      disabled={saving}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#18181C] transition-colors disabled:opacity-50 text-left"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
                        style={{ backgroundColor: selected ? label.color : "transparent", borderColor: label.color }}
                      />
                      <span className="text-xs text-[#EDEDEF] flex-1">{label.name}</span>
                      {selected && <span className="text-[#7C6FFD] text-xs">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
