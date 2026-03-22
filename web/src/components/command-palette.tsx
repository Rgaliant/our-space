"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface TicketResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_id: string;
  project_name: string;
}

interface SpecResult {
  id: string;
  title: string;
  status: string;
  project_id: string;
}

interface SearchResults {
  tickets: TicketResult[];
  specs: SpecResult[];
}

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-[#4A4A5A]",
};

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  in_review: "In Review", done: "Done",
};

interface Props {
  workspaceSlug: string;
}

export function CommandPalette({ workspaceSlug }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ tickets: [], specs: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults({ tickets: [], specs: [] });
      setSelectedIdx(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults({ tickets: [], specs: [] }); return; }
    setLoading(true);
    const token = await getToken();
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.data);
        setSelectedIdx(0);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, workspaceSlug]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const allResults = [
    ...results.tickets.map((t) => ({ type: "ticket" as const, item: t })),
    ...results.specs.map((s) => ({ type: "spec" as const, item: s })),
  ];

  function navigate(result: typeof allResults[number]) {
    setOpen(false);
    if (result.type === "ticket") {
      const t = result.item as TicketResult;
      router.push(`/workspace/${workspaceSlug}/projects/${t.project_id}/tickets/${t.id}`);
    } else {
      const s = result.item as SpecResult;
      router.push(`/workspace/${workspaceSlug}/projects/${s.project_id}/specs/${s.id}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[selectedIdx]) {
      navigate(allResults[selectedIdx]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[#111114] border border-[#27272B] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272B]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#4A4A5A] shrink-0">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets and specs..."
            className="flex-1 bg-transparent text-sm text-[#EDEDEF] placeholder-[#4A4A5A] outline-none"
          />
          {loading && (
            <span className="w-4 h-4 border-2 border-[#4A4A5A] border-t-[#7C6FFD] rounded-full animate-spin shrink-0" />
          )}
          <kbd className="text-[10px] text-[#4A4A5A] border border-[#27272B] rounded px-1.5 py-0.5 font-mono">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {allResults.length === 0 && query.trim() && !loading && (
            <p className="text-sm text-[#4A4A5A] px-4 py-6 text-center">No results for &ldquo;{query}&rdquo;</p>
          )}
          {allResults.length === 0 && !query.trim() && (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-[#4A4A5A]">Type to search tickets and specs across your workspace</p>
            </div>
          )}

          {results.tickets.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#4A4A5A] uppercase tracking-wider px-4 pt-3 pb-1">Tickets</p>
              {results.tickets.map((ticket, i) => {
                const idx = i;
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => navigate({ type: "ticket", item: ticket })}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-[#7C6FFD]/10" : "hover:bg-[#18181C]"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[ticket.priority] ?? PRIORITY_DOT.low}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isSelected ? "text-[#7C6FFD]" : "text-[#EDEDEF]"}`}>{ticket.title}</p>
                      <p className="text-xs text-[#4A4A5A] mt-0.5">{ticket.project_name} · {STATUS_LABEL[ticket.status] ?? ticket.status}</p>
                    </div>
                    <span className="text-xs text-[#4A4A5A] shrink-0 mt-0.5">ticket</span>
                  </button>
                );
              })}
            </div>
          )}

          {results.specs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#4A4A5A] uppercase tracking-wider px-4 pt-3 pb-1">Specs</p>
              {results.specs.map((spec, i) => {
                const idx = results.tickets.length + i;
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={spec.id}
                    onClick={() => navigate({ type: "spec", item: spec })}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-[#7C6FFD]/10" : "hover:bg-[#18181C]"
                    }`}
                  >
                    <span className="text-xs text-[#7C6FFD] shrink-0">✦</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isSelected ? "text-[#7C6FFD]" : "text-[#EDEDEF]"}`}>{spec.title}</p>
                      <p className="text-xs text-[#4A4A5A] mt-0.5">{spec.status}</p>
                    </div>
                    <span className="text-xs text-[#4A4A5A] shrink-0">spec</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#27272B] bg-[#0C0C0E]">
          <span className="text-[10px] text-[#4A4A5A] flex items-center gap-1"><kbd className="font-mono border border-[#27272B] rounded px-1">↑↓</kbd> navigate</span>
          <span className="text-[10px] text-[#4A4A5A] flex items-center gap-1"><kbd className="font-mono border border-[#27272B] rounded px-1">↵</kbd> open</span>
          <span className="text-[10px] text-[#4A4A5A] flex items-center gap-1"><kbd className="font-mono border border-[#27272B] rounded px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
