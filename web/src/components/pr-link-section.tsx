"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface PullRequest {
  id: string;
  url: string;
  title: string;
  repo: string;
  pr_number: number;
  status: "open" | "merged" | "closed";
}

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  open:   { badge: "border-green-500/30 bg-green-500/10 text-green-400", dot: "bg-green-400", label: "Open" },
  merged: { badge: "border-[#7C6FFD]/30 bg-[#7C6FFD]/10 text-[#7C6FFD]", dot: "bg-[#7C6FFD]", label: "Merged" },
  closed: { badge: "border-[#3A3A42] bg-[#18181C] text-[#4A4A5A]", dot: "bg-[#4A4A5A]", label: "Closed" },
};

const STATUS_OPTIONS = ["open", "merged", "closed"] as const;

interface Props {
  workspaceSlug: string;
  projectId: string;
  ticketId: string;
  initialPrs: PullRequest[];
}

export function PrLinkSection({ workspaceSlug, projectId, ticketId, initialPrs }: Props) {
  const { getToken } = useAuth();
  const [prs, setPrs] = useState<PullRequest[]>(initialPrs);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const base = `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}/pull_requests`;

  async function addPr(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    const token = await getToken();
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pull_request: { url: url.trim(), title: title.trim() || undefined } }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrs((prev) => [...prev, data.data]);
        setUrl("");
        setTitle("");
        setAdding(false);
      } else {
        const data = await res.json();
        setError(data.error?.message ?? "Failed to link PR");
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(pr: PullRequest, status: string) {
    setUpdatingId(pr.id);
    const token = await getToken();
    try {
      const res = await fetch(`${base}/${pr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pull_request: { status } }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrs((prev) => prev.map((p) => p.id === pr.id ? data.data : p));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function deletePr(id: string) {
    setDeletingId(id);
    const token = await getToken();
    try {
      const res = await fetch(`${base}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPrs((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider">Pull Requests</p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-[#7C6FFD] hover:text-[#9B90FF] transition-colors"
          >
            + Link PR
          </button>
        )}
      </div>

      {prs.length === 0 && !adding && (
        <p className="text-xs text-[#4A4A5A] italic">No linked PRs.</p>
      )}

      {prs.length > 0 && (
        <ul className="space-y-2 mb-3">
          {prs.map((pr) => {
            const s = STATUS_STYLES[pr.status] ?? STATUS_STYLES.open;
            const isUpdating = updatingId === pr.id;
            const isDeleting = deletingId === pr.id;
            return (
              <li key={pr.id} className="flex items-center gap-3 bg-[#111114] border border-[#27272B] rounded-xl px-3 py-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#EDEDEF] hover:text-[#7C6FFD] transition-colors truncate block"
                  >
                    {pr.repo} #{pr.pr_number}
                    {pr.title && pr.title !== `PR #${pr.pr_number}` && (
                      <span className="text-[#88889A] font-normal ml-1">— {pr.title}</span>
                    )}
                  </a>
                </div>
                <select
                  value={pr.status}
                  disabled={isUpdating}
                  onChange={(e) => updateStatus(pr, e.target.value)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-transparent cursor-pointer disabled:opacity-50 ${s.badge}`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#111114] text-[#EDEDEF]">
                      {STATUS_STYLES[opt].label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deletePr(pr.id)}
                  disabled={isDeleting}
                  className="text-xs text-[#4A4A5A] hover:text-red-400 disabled:opacity-50 transition-colors shrink-0"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <form onSubmit={addPr} className="bg-[#111114] border border-[#27272B] rounded-xl p-3 space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/org/repo/pull/123"
            autoFocus
            className="w-full bg-[#0C0C0E] border border-[#27272B] rounded-lg px-3 py-1.5 text-xs text-[#EDEDEF] placeholder-[#4A4A5A] focus:outline-none focus:border-[#7C6FFD]/50 transition-all"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="PR title (optional)"
            className="w-full bg-[#0C0C0E] border border-[#27272B] rounded-lg px-3 py-1.5 text-xs text-[#EDEDEF] placeholder-[#4A4A5A] focus:outline-none focus:border-[#7C6FFD]/50 transition-all"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !url.trim()}
              className="px-3 py-1.5 bg-[#7C6FFD] text-white text-xs font-medium rounded-lg hover:bg-[#6B5EEC] disabled:opacity-50 transition-colors"
            >
              {saving ? "Linking..." : "Link PR"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setUrl(""); setTitle(""); setError(null); }}
              className="px-3 py-1.5 text-xs text-[#88889A] hover:text-[#EDEDEF] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
