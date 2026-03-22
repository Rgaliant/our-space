"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { MisalignedTicketEvent, ProposedTicketEvent } from "@/lib/api";

interface SignalPanelProps {
  workspaceSlug: string;
  projects: { id: string; name: string }[];
  alignedCount: number;
  misaligned: MisalignedTicketEvent[];
  proposed: ProposedTicketEvent[];
  isStreaming: boolean;
  token: string;
}

export function SignalPanel({
  workspaceSlug,
  projects,
  alignedCount,
  misaligned,
  proposed,
  isStreaming,
  token,
}: SignalPanelProps) {
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  async function addTicket(ticket: ProposedTicketEvent, idx: number) {
    if (addedIds.has(idx) || addingIdx === idx) return;

    const projectId = ticket.project_id ?? projects[0]?.id;
    if (!projectId) return;

    // Find the project to get a spec, or create ticket without spec
    setAddingIdx(idx);
    try {
      // Get specs for the project to attach to one, or use project-level ticket endpoint
      const specsRes = await apiClient<{ data: { id: string }[] }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/specs`,
        { token }
      );
      const specId = specsRes.data[0]?.id;

      if (specId) {
        await apiClient(
          `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/specs/${specId}/tickets`,
          {
            method: "POST",
            token,
            body: JSON.stringify({
              ticket: {
                title: ticket.title,
                description: ticket.description ?? null,
                priority: ticket.priority,
                story_points: ticket.story_points ?? null,
                status: "backlog",
              },
            }),
          }
        );
      }

      setAddedIds((prev) => new Set([...prev, idx]));
    } catch {
      // silently fail — user can retry
    } finally {
      setAddingIdx(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Counts row */}
      <div className="flex gap-3 px-5 pt-5 pb-4 shrink-0">
        <CountBadge label="Aligned" count={alignedCount} color="emerald" />
        <CountBadge label="Misaligned" count={misaligned.length} color="amber" />
        <CountBadge label="Proposed" count={proposed.length} color="violet" />
      </div>

      <div className="flex flex-col gap-5 px-5 pb-5">
        {/* Misaligned section */}
        {misaligned.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider mb-2.5">
              Misaligned
            </p>
            <div className="flex flex-col gap-2">
              {misaligned.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3.5 py-3"
                >
                  <p className="text-sm font-medium text-[#EDEDEF] leading-snug mb-1">{t.title}</p>
                  <p className="text-xs text-[#88889A] leading-relaxed">{t.reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Proposed section */}
        {proposed.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[#7C6FFD] uppercase tracking-wider mb-2.5">
              Proposed
            </p>
            <div className="flex flex-col gap-2">
              {proposed.map((t, idx) => {
                const added = addedIds.has(idx);
                const adding = addingIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border px-3.5 py-3 transition-opacity ${
                      added
                        ? "border-[#7C6FFD]/10 bg-[#7C6FFD]/3 opacity-60"
                        : "border-[#7C6FFD]/30 bg-[#7C6FFD]/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium text-[#EDEDEF] leading-snug">{t.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PriorityBadge priority={t.priority} />
                        {t.story_points != null && (
                          <span className="text-xs text-[#4A4A5A] font-mono">{t.story_points}pt</span>
                        )}
                      </div>
                    </div>
                    {t.description && (
                      <p className="text-xs text-[#88889A] leading-relaxed mb-2.5">{t.description}</p>
                    )}
                    {added ? (
                      <p className="text-xs font-medium text-emerald-400">Added ✓</p>
                    ) : (
                      <button
                        onClick={() => addTicket(t, idx)}
                        disabled={adding || !projects.length}
                        className="text-xs font-medium text-[#7C6FFD] hover:text-[#9D8FFD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {adding ? "Adding..." : "+ Add to Backlog"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state while streaming */}
        {isStreaming && misaligned.length === 0 && proposed.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="flex gap-1 mb-3">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-[#4A4A5A] animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
            <p className="text-xs text-[#4A4A5A]">Analyzing signals...</p>
          </div>
        )}

        {/* Empty state when done */}
        {!isStreaming && misaligned.length === 0 && proposed.length === 0 && alignedCount === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <p className="text-sm text-[#4A4A5A]">Run Distill to Plan to see signals</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CountBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "emerald" | "amber" | "violet";
}) {
  const styles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
    violet: "text-[#7C6FFD] bg-[#7C6FFD]/10 border-[#7C6FFD]/20",
  };

  return (
    <div className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-center ${styles[color]}`}>
      <span className="text-lg font-bold leading-none">{count}</span>
      <span className="text-xs mt-0.5 font-medium">{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10",
    high: "text-orange-400 bg-orange-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    low: "text-[#88889A] bg-[#27272B]",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${styles[priority] ?? styles.medium}`}>
      {priority}
    </span>
  );
}
