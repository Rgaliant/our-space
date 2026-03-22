"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Cycle {
  id: string;
  name: string;
  status: string;
}

interface Props {
  workspaceSlug: string;
  projectId: string;
  ticketId: string;
  currentCycleId: string | null;
  cycles: Cycle[];
  onUpdate: (cycleId: string | null) => void;
}

export function CycleSelector({ workspaceSlug, projectId, ticketId, currentCycleId, cycles, onUpdate }: Props) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = cycles.find((c) => c.id === currentCycleId);

  async function select(cycleId: string | null) {
    setOpen(false);
    setSaving(true);
    const token = await getToken();
    if (!token) { setSaving(false); return; }
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ticket: { cycle_id: cycleId } }),
        }
      );
      if (res.ok) onUpdate(cycleId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-[#27272B] bg-[#111114] text-[#88889A] hover:border-[#3A3A42] hover:text-[#EDEDEF] transition-all disabled:opacity-50"
      >
        <span>↻</span>
        <span className="truncate max-w-28">{saving ? "Saving…" : current ? current.name : "No cycle"}</span>
        <span className="text-[#4A4A5A]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 w-52 bg-[#111114] border border-[#27272B] rounded-xl shadow-xl overflow-hidden">
            <button
              onClick={() => select(null)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${!currentCycleId ? "text-[#7C6FFD] bg-[#7C6FFD]/10" : "text-[#88889A] hover:bg-[#18181C] hover:text-[#EDEDEF]"}`}
            >
              No cycle
            </button>
            {cycles.map((c) => (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${c.id === currentCycleId ? "text-[#7C6FFD] bg-[#7C6FFD]/10" : "text-[#88889A] hover:bg-[#18181C] hover:text-[#EDEDEF]"}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === "active" ? "bg-emerald-400" : c.status === "upcoming" ? "bg-[#4A4A5A]" : "bg-[#27272B]"}`} />
                  {c.name}
                </span>
              </button>
            ))}
            {cycles.length === 0 && (
              <p className="px-3 py-3 text-xs text-[#4A4A5A]">No cycles yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
