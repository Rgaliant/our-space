"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Author {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  body: string;
  author_id: string;
  author: Author;
  created_at: string;
}

interface Props {
  workspaceSlug: string;
  projectId: string;
  ticketId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(author: Author): string {
  const name = author.display_name || author.email;
  return name.slice(0, 2).toUpperCase();
}

export function TicketComments({ workspaceSlug, projectId, ticketId }: Props) {
  const { getToken, userId } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}/comments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setComments(data.data ?? []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [workspaceSlug, projectId, ticketId, getToken]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [body]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const token = await getToken();
    if (!token) { setSubmitting(false); return; }
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ticket_comment: { body: body.trim() } }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.data]);
        setBody("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    const token = await getToken();
    if (!token) { setDeletingId(null); return; }
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider mb-3">
        Comments {comments.length > 0 && `· ${comments.length}`}
      </p>

      {comments.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#7C6FFD]/15 flex items-center justify-center text-xs font-semibold text-[#7C6FFD]">
                {initials(comment.author)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-[#EDEDEF]">
                    {comment.author.display_name || comment.author.email}
                  </span>
                  <span className="text-xs text-[#4A4A5A]">{timeAgo(comment.created_at)}</span>
                  {comment.author_id === userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="ml-auto text-xs text-[#4A4A5A] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                    >
                      {deletingId === comment.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-[#C4C4CE] leading-relaxed whitespace-pre-wrap">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2.5 items-start">
          <div className="shrink-0 w-7 h-7 rounded-full bg-[#27272B] flex items-center justify-center text-xs text-[#4A4A5A] mt-0.5">
            me
          </div>
          <div className="flex-1 bg-[#111114] border border-[#27272B] rounded-xl px-3 py-2.5 focus-within:border-[#7C6FFD]/40 focus-within:ring-1 focus-within:ring-[#7C6FFD]/10 transition-all">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Leave a comment…"
              disabled={submitting}
              rows={1}
              className="w-full bg-transparent text-sm text-[#EDEDEF] placeholder-[#4A4A5A] resize-none outline-none disabled:opacity-50 leading-relaxed"
            />
            {body.trim() && (
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-medium px-3 py-1.5 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] disabled:opacity-40 transition-colors"
                >
                  {submitting ? "Posting…" : "Comment"}
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-[#4A4A5A] mt-1.5 ml-9">⌘↵ to post</p>
      </form>
    </div>
  );
}
