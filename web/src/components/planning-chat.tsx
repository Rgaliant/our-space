"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { streamPlanMessage, SpecCreatedEvent } from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PlanningChatProps {
  workspaceSlug: string;
  conversationId: string;
  projectId?: string;
  initialMessages?: Message[];
}

function filterSpecXml(content: string): string {
  return content.replace(/<generate_spec>[\s\S]*?<\/generate_spec>/g, "").trim();
}

function AssistantMessage({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const filtered = filterSpecXml(content);
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
        <span className="text-indigo-500 text-xs leading-none">✦</span>
      </div>
      <div
        className="
          flex-1 min-w-0 text-sm text-gray-800 leading-relaxed
          [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:first:mt-0
          [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:first:mt-0
          [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-gray-900 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:first:mt-0
          [&_p]:mb-2 [&_p:last-child]:mb-0
          [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:list-disc [&_ul]:marker:text-indigo-300
          [&_ol]:mb-2 [&_ol]:pl-4 [&_ol]:space-y-1 [&_ol]:list-decimal
          [&_li]:text-gray-700
          [&_strong]:font-semibold [&_strong]:text-gray-900
          [&_em]:italic [&_em]:text-gray-600
          [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-gray-800
          [&_pre]:bg-gray-50 [&_pre]:border [&_pre]:border-gray-200 [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:mb-2 [&_pre]:overflow-x-auto
          [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs
          [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-200 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic
          [&_hr]:border-gray-100 [&_hr]:my-3
        "
      >
        <ReactMarkdown>{filtered}</ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-0.5 rounded-sm align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function PlanningChat({
  workspaceSlug,
  conversationId,
  projectId,
  initialMessages = [],
}: PlanningChatProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [specCreated, setSpecCreated] = useState<SpecCreatedEvent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

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
    if (!token) {
      setIsStreaming(false);
      return;
    }

    let accumulated = "";

    await streamPlanMessage({
      workspaceSlug,
      conversationId,
      message: userMessage.content,
      projectId,
      token,
      onChunk: (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      onSpecCreated: (event) => {
        setSpecCreated(event);
      },
      onDone: () => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: accumulated,
          },
        ]);
        setStreamingContent("");
        setIsStreaming(false);
      },
      onError: (error) => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${error}`,
          },
        ]);
        setStreamingContent("");
        setIsStreaming(false);
      },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Board created — slim banner */}
      {specCreated && (
        <div className="flex items-center justify-between px-6 py-2 bg-emerald-50 border-b border-emerald-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-medium text-emerald-800 truncate">
              Board created &mdash; {specCreated.ticket_count} ticket
              {specCreated.ticket_count !== 1 ? "s" : ""} &middot;{" "}
              <span className="font-normal text-emerald-600">{specCreated.spec_title}</span>
            </p>
          </div>
          <Link
            href={`/workspace/${workspaceSlug}/projects/${specCreated.project_id}/board`}
            className="shrink-0 ml-4 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors"
          >
            View board →
          </Link>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-20">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <span className="text-indigo-500 text-xl leading-none">✦</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">Planning Mode</h2>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Describe the feature you want to build. I&apos;ll ask clarifying questions, then
              generate a spec and tickets automatically.
            </p>
            {!projectId && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
                Select a project in the top bar to enable ticket generation
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[75%] bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <AssistantMessage key={msg.id} content={msg.content} />
              )
            )}

            {isStreaming &&
              (streamingContent ? (
                <AssistantMessage content={streamingContent} isStreaming />
              ) : (
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                    <span className="text-indigo-500 text-xs leading-none">✦</span>
                  </div>
                  <div className="flex gap-1 items-center pt-2">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your feature idea..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none disabled:opacity-50 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="shrink-0 mb-0.5 w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
                  stroke="white"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-300 mt-2">
            Enter to send &middot; Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
