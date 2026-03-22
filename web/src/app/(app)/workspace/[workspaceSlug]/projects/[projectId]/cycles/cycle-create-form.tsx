"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

interface Props {
  workspaceSlug: string;
  projectId: string;
}

export function CycleCreateForm({ workspaceSlug, projectId }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate || submitting) return;
    setSubmitting(true);
    setError(null);
    const token = await getToken();
    if (!token) { setSubmitting(false); return; }
    try {
      await apiClient(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ cycle: { name: name.trim(), start_date: startDate, end_date: endDate, status: "upcoming" } }),
        }
      );
      setOpen(false);
      setName("");
      setStartDate("");
      setEndDate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cycle");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7C6FFD] border border-[#7C6FFD]/30 rounded-lg hover:bg-[#7C6FFD]/10 transition-colors"
      >
        + New Cycle
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Cycle name"
        autoFocus
        className="bg-[#111114] border border-[#27272B] rounded-lg px-3 py-1.5 text-xs text-[#EDEDEF] placeholder-[#4A4A5A] outline-none focus:border-[#7C6FFD]/40 w-36"
      />
      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
        className="bg-[#111114] border border-[#27272B] rounded-lg px-3 py-1.5 text-xs text-[#EDEDEF] outline-none focus:border-[#7C6FFD]/40 [color-scheme:dark]" />
      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
        className="bg-[#111114] border border-[#27272B] rounded-lg px-3 py-1.5 text-xs text-[#EDEDEF] outline-none focus:border-[#7C6FFD]/40 [color-scheme:dark]" />
      <button type="submit" disabled={submitting || !name.trim() || !startDate || !endDate}
        className="text-xs font-medium px-3 py-1.5 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] disabled:opacity-40 transition-colors">
        {submitting ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="text-xs text-[#4A4A5A] hover:text-[#88889A] transition-colors">
        Cancel
      </button>
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </form>
  );
}
