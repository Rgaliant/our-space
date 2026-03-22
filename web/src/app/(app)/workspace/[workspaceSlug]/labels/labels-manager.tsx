"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { LabelBadge } from "@/components/label-badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const PRESET_COLORS = [
  "#7C6FFD", "#10B981", "#F59E0B", "#EF4444", "#3B82F6",
  "#EC4899", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316",
];

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Props {
  workspaceSlug: string;
  initialLabels: Label[];
}

export function LabelsManager({ workspaceSlug, initialLabels }: Props) {
  const { getToken } = useAuth();
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const token = await getToken();
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceSlug}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: { name: name.trim(), color } }),
      });
      if (res.ok) {
        const data = await res.json();
        setLabels((prev) => [...prev, data.data]);
        setName("");
      } else {
        const data = await res.json();
        setError(data.error?.message ?? "Failed to create label");
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteLabel(id: string) {
    setDeletingId(id);
    const token = await getToken();
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceSlug}/labels/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLabels((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Create form */}
      <div className="bg-[#111114] border border-[#27272B] rounded-xl p-4">
        <h2 className="text-xs font-semibold text-[#EDEDEF] mb-3">New Label</h2>
        <form onSubmit={createLabel} className="space-y-3">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Label name"
              maxLength={50}
              className="w-full bg-[#0C0C0E] border border-[#27272B] rounded-lg px-3 py-2 text-sm text-[#EDEDEF] placeholder-[#4A4A5A] focus:outline-none focus:border-[#7C6FFD]/50 focus:ring-1 focus:ring-[#7C6FFD]/20 transition-all"
            />
          </div>
          <div>
            <p className="text-xs text-[#4A4A5A] mb-2">Color</p>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#EDEDEF" : "transparent",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border border-[#27272B]"
                title="Custom color"
              />
            </div>
          </div>

          {name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#4A4A5A]">Preview:</span>
              <LabelBadge label={{ id: "preview", name, color }} />
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="px-4 py-1.5 bg-[#7C6FFD] text-white text-xs font-medium rounded-lg hover:bg-[#6B5EEC] disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create Label"}
          </button>
        </form>
      </div>

      {/* Label list */}
      <div>
        <h2 className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider mb-3">
          {labels.length} Label{labels.length !== 1 ? "s" : ""}
        </h2>
        {labels.length === 0 ? (
          <p className="text-sm text-[#4A4A5A]">No labels yet.</p>
        ) : (
          <ul className="space-y-2">
            {labels.map((label) => (
              <li
                key={label.id}
                className="flex items-center justify-between bg-[#111114] border border-[#27272B] rounded-xl px-4 py-2.5"
              >
                <LabelBadge label={label} />
                <button
                  onClick={() => deleteLabel(label.id)}
                  disabled={deletingId === label.id}
                  className="text-xs text-[#4A4A5A] hover:text-red-400 disabled:opacity-50 transition-colors"
                >
                  {deletingId === label.id ? "..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
