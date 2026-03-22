"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { LabelBadge } from "./label-badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  spec_id: string | null;
  project_id: string;
  labels: Label[];
}

const COLUMNS = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  low: "bg-[#27272B] text-[#88889A] border-[#3A3A42]",
};

const STATUS_ORDER = ["backlog", "todo", "in_progress", "in_review", "done"];

interface Props {
  initialTickets: Ticket[];
  workspaceSlug: string;
  projectId: string;
}

export function KanbanBoard({ initialTickets, workspaceSlug, projectId }: Props) {
  const { getToken } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function moveTicket(ticket: Ticket, direction: "forward" | "back") {
    const currentIdx = STATUS_ORDER.indexOf(ticket.status);
    const nextIdx = direction === "forward" ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx < 0 || nextIdx >= STATUS_ORDER.length) return;
    const newStatus = STATUS_ORDER[nextIdx];
    setMovingId(ticket.id);
    const token = await getToken();
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticket.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ticket: { status: newStatus } }) }
      );
      if (res.ok) setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: newStatus } : t));
    } finally {
      setMovingId(null);
    }
  }

  const ticketsByStatus = COLUMNS.reduce<Record<string, Ticket[]>>((acc, col) => {
    acc[col.status] = tickets.filter((t) => t.status === col.status);
    return acc;
  }, {});

  return (
    <div className="flex gap-3 p-5 overflow-x-auto h-full items-start bg-[#0C0C0E]">
      {COLUMNS.map((col) => {
        const colTickets = ticketsByStatus[col.status] ?? [];
        return (
          <div key={col.status} className="shrink-0 w-60">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <h3 className="text-xs font-semibold text-[#88889A] uppercase tracking-wider">{col.label}</h3>
              <span className="text-xs bg-[#18181C] text-[#4A4A5A] border border-[#27272B] rounded-full px-1.5 py-0.5 leading-none">
                {colTickets.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {colTickets.map((ticket) => {
                const isExpanded = expandedId === ticket.id;
                const isMoving = movingId === ticket.id;
                const colIdx = STATUS_ORDER.indexOf(col.status);
                return (
                  <div
                    key={ticket.id}
                    className={`bg-[#111114] border rounded-xl p-3 cursor-pointer transition-all ${
                      isExpanded ? "border-[#7C6FFD]/40 shadow-lg shadow-[#7C6FFD]/5" : "border-[#27272B] hover:border-[#3A3A42]"
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  >
                    <Link
                      href={`/workspace/${workspaceSlug}/projects/${projectId}/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-[#EDEDEF] leading-snug hover:text-[#7C6FFD] transition-colors block mb-2"
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[ticket.priority] ?? PRIORITY_STYLES.low}`}>
                        {ticket.priority}
                      </span>
                      {ticket.story_points && (
                        <span className="text-xs text-[#4A4A5A] border border-[#27272B] rounded px-1.5 py-0.5">
                          {ticket.story_points}pt
                        </span>
                      )}
                      {ticket.labels?.slice(0, 2).map((label) => (
                        <LabelBadge key={label.id} label={label} size="xs" />
                      ))}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#27272B]">
                        {ticket.description && (
                          <p className="text-xs text-[#88889A] mb-3 leading-relaxed line-clamp-3">
                            {ticket.description}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          {colIdx > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTicket(ticket, "back"); }}
                              disabled={isMoving}
                              className="flex-1 text-xs py-1.5 border border-[#27272B] rounded-lg text-[#88889A] hover:bg-[#18181C] hover:text-[#EDEDEF] disabled:opacity-50 transition-all"
                            >
                              ← {COLUMNS[colIdx - 1].label}
                            </button>
                          )}
                          {colIdx < COLUMNS.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTicket(ticket, "forward"); }}
                              disabled={isMoving}
                              className="flex-1 text-xs py-1.5 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] disabled:opacity-50 transition-all"
                            >
                              {COLUMNS[colIdx + 1].label} →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {colTickets.length === 0 && (
                <div className="border border-dashed border-[#27272B] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#4A4A5A]">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
