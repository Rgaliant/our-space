"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  spec_id: string | null;
  project_id: string;
}

const COLUMNS: { status: string; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
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
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticket: { status: newStatus } }),
        }
      );
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t))
        );
      }
    } finally {
      setMovingId(null);
    }
  }

  const ticketsByStatus = COLUMNS.reduce<Record<string, Ticket[]>>((acc, col) => {
    acc[col.status] = tickets.filter((t) => t.status === col.status);
    return acc;
  }, {});

  return (
    <div className="flex gap-4 p-6 overflow-x-auto min-h-full items-start">
      {COLUMNS.map((col) => {
        const colTickets = ticketsByStatus[col.status] ?? [];
        return (
          <div key={col.status} className="shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
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
                    className="bg-white border rounded-lg p-3 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  >
                    <Link
                      href={`/workspace/${workspaceSlug}/projects/${projectId}/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-gray-900 leading-snug hover:text-indigo-600 transition-colors"
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS.medium
                        }`}
                      >
                        {ticket.priority}
                      </span>
                      {ticket.story_points && (
                        <span className="text-xs text-gray-400 border rounded px-1.5 py-0.5">
                          {ticket.story_points}pt
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t">
                        {ticket.description && (
                          <p className="text-xs text-gray-600 mb-3 whitespace-pre-wrap">
                            {ticket.description}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          {colIdx > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTicket(ticket, "back"); }}
                              disabled={isMoving}
                              className="flex-1 text-xs py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                              ← {COLUMNS[colIdx - 1].label}
                            </button>
                          )}
                          {colIdx < COLUMNS.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTicket(ticket, "forward"); }}
                              disabled={isMoving}
                              className="flex-1 text-xs py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-400">No tickets</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
