"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  priority_score: number | null;
  story_points: number | null;
  project_id: string;
  spec_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Spec {
  id: string;
  title: string;
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  ticket: Ticket;
  spec: Spec | null;
  workspaceSlug: string;
  projectId: string;
}

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const;
const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-500",
};

export function TicketDetail({ ticket: initialTicket, spec, workspaceSlug, projectId }: Props) {
  const { getToken } = useAuth();
  const [ticket, setTicket] = useState(initialTicket);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // AI assistant state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  async function updateStatus(status: string) {
    setUpdatingStatus(true);
    const token = await getToken();
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticket.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ticket: { status } }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTicket(data.data);
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const token = await getToken();
    if (!token) { setIsStreaming(false); return; }

    const res = await fetch(
      `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/ai/tickets/${ticket.id}/assistant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket_assistant: { message: userMessage.content } }),
      }
    );

    if (!res.ok || !res.body) { setIsStreaming(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: accumulated }]);
          setStreamingContent("");
          setIsStreaming(false);
          return;
        }
        try {
          const chunk = JSON.parse(data);
          if (typeof chunk === "string") { accumulated += chunk; setStreamingContent(accumulated); }
        } catch { /* ignore */ }
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }
  }

  const currentStatusIdx = STATUSES.indexOf(ticket.status as typeof STATUSES[number]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: ticket details */}
      <div className="flex-1 overflow-y-auto px-8 py-6 border-r">
        <div className="max-w-2xl">
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 mb-4">{ticket.title}</h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS.medium}`}>
              {ticket.priority}
            </span>
            {ticket.story_points && (
              <span className="text-xs border rounded px-2.5 py-1 text-gray-500">
                {ticket.story_points} pt
              </span>
            )}
            {spec && (
              <span className="text-xs border rounded px-2.5 py-1 text-gray-500 truncate max-w-48">
                ↗ {spec.title}
              </span>
            )}
          </div>

          {/* Status stepper */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
            <div className="flex items-center gap-1 flex-wrap">
              {STATUSES.map((s, idx) => (
                <button
                  key={s}
                  onClick={() => s !== ticket.status && updateStatus(s)}
                  disabled={updatingStatus}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    s === ticket.status
                      ? "bg-indigo-600 text-white shadow-sm"
                      : idx < currentStatusIdx
                      ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  } disabled:opacity-50`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
            {ticket.description ? (
              <div className="
                text-sm text-gray-700 leading-relaxed
                [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-3 [&_h2]:mb-1.5
                [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-gray-900 [&_h3]:mt-2 [&_h3]:mb-1
                [&_p]:mb-2 [&_p:last-child]:mb-0
                [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:list-disc [&_ul]:marker:text-gray-300
                [&_ol]:mb-2 [&_ol]:pl-4 [&_ol]:space-y-1 [&_ol]:list-decimal
                [&_strong]:font-semibold [&_strong]:text-gray-900
                [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                [&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:overflow-x-auto
                [&_pre_code]:bg-transparent [&_pre_code]:p-0
              ">
                <ReactMarkdown>{ticket.description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No description.</p>
            )}
          </div>

          {/* Spec content (collapsed) */}
          {spec && (
            <details className="group">
              <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 cursor-pointer select-none hover:text-gray-600 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Spec — {spec.title}
              </summary>
              <div className="mt-2 pl-4 border-l-2 border-gray-100 text-sm text-gray-600 leading-relaxed
                [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mt-3 [&_h2]:mb-1
                [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-2 [&_h3]:mb-0.5
                [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:list-disc [&_ul]:space-y-0.5
                [&_strong]:font-semibold [&_strong]:text-gray-800
                [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
              ">
                <ReactMarkdown>{spec.content}</ReactMarkdown>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Right: AI assistant */}
      <div className="w-96 flex flex-col bg-gray-50">
        <div className="px-4 py-3 border-b bg-white">
          <p className="text-xs font-semibold text-gray-900">AI Assistant</p>
          <p className="text-xs text-gray-400 mt-0.5">Ask anything about this ticket</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center pt-8">
              <span className="text-2xl">⚡</span>
              <p className="text-xs text-gray-400 mt-2">
                Ask for implementation guidance, clarification, or help breaking this ticket down.
              </p>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] bg-indigo-600 text-white text-xs px-3 py-2 rounded-2xl rounded-tr-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-2 items-start">
                <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                  <span className="text-amber-600 text-xs leading-none">⚡</span>
                </div>
                <div className="flex-1 min-w-0 text-xs text-gray-800 leading-relaxed
                  [&_p]:mb-1.5 [&_p:last-child]:mb-0
                  [&_ul]:mb-1.5 [&_ul]:pl-3 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:marker:text-gray-300
                  [&_ol]:mb-1.5 [&_ol]:pl-3 [&_ol]:list-decimal [&_ol]:space-y-0.5
                  [&_strong]:font-semibold [&_strong]:text-gray-900
                  [&_code]:bg-white [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:border
                  [&_pre]:bg-white [&_pre]:border [&_pre]:rounded-lg [&_pre]:p-2.5 [&_pre]:mb-1.5 [&_pre]:overflow-x-auto
                  [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:border-0
                  [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-2 [&_h2]:mb-1
                  [&_h3]:font-medium [&_h3]:text-gray-900 [&_h3]:mt-1.5 [&_h3]:mb-0.5
                ">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            )
          )}

          {isStreaming && (
            streamingContent ? (
              <div className="flex gap-2 items-start">
                <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                  <span className="text-amber-600 text-xs leading-none">⚡</span>
                </div>
                <div className="flex-1 text-xs text-gray-800 leading-relaxed
                  [&_p]:mb-1.5 [&_p:last-child]:mb-0
                  [&_ul]:mb-1.5 [&_ul]:pl-3 [&_ul]:list-disc [&_ul]:space-y-0.5
                  [&_strong]:font-semibold [&_strong]:text-gray-900
                  [&_code]:bg-white [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:border
                  [&_pre]:bg-white [&_pre]:border [&_pre]:rounded-lg [&_pre]:p-2.5 [&_pre]:overflow-x-auto
                  [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:border-0
                ">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="inline-block w-1 h-3 bg-amber-400 ml-0.5 rounded-sm align-middle animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                  <span className="text-amber-600 text-xs leading-none">⚡</span>
                </div>
                <div className="flex gap-1 items-center pt-1.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t bg-white">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-50 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about implementation..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent text-xs text-gray-900 placeholder-gray-400 resize-none outline-none disabled:opacity-50 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="shrink-0 mb-0.5 w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
