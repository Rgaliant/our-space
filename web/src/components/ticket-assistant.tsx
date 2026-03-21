"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface TicketAssistantProps {
  workspaceSlug: string;
  projectId: string;
  ticketId: string;
}

export function TicketAssistant({
  workspaceSlug,
  projectId,
  ticketId,
}: TicketAssistantProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const token = await getToken();
    if (!token) { setIsStreaming(false); return; }

    const res = await fetch(
      `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/ai/tickets/${ticketId}/assistant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket_assistant: { message: userMessage.content } }),
      }
    );

    if (!res.ok || !res.body) {
      setIsStreaming(false);
      return;
    }

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
          if (typeof chunk === "string") {
            accumulated += chunk;
            setStreamingContent(accumulated);
          }
        } catch { /* ignore */ }
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4">
            Ask anything about this ticket...
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-900 whitespace-pre-wrap">
              {streamingContent || <span className="text-gray-400">Thinking...</span>}
              {streamingContent && <span className="inline-block w-1 h-3 ml-0.5 bg-gray-400 animate-pulse" />}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this ticket..."
            disabled={isStreaming}
            className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
