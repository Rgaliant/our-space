"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  streamDistillation,
  apiClient,
  MisalignedTicketEvent,
  ProposedTicketEvent,
} from "@/lib/api";
import { SignalPanel } from "./signal-panel";

interface Project {
  id: string;
  name: string;
}

interface Distillation {
  id: string;
  north_star: string;
  plan_content: string | null;
  proposed_tickets: ProposedTicketEvent[];
  misaligned_ticket_ids: number[];
  status: string;
  created_at: string;
}

interface Props {
  workspaceSlug: string;
  projects: Project[];
  initialNorthStar: string;
  recentDistillations: Distillation[];
  totalTickets: number;
}

type Phase = "idle" | "streaming" | "complete";

const PLAN_START = "<plan_content>";
const PLAN_END = "</plan_content>";

function extractPlanContent(raw: string): string {
  const start = raw.indexOf(PLAN_START);
  if (start === -1) return "";
  const contentStart = start + PLAN_START.length;
  const end = raw.indexOf(PLAN_END);
  return end === -1 ? raw.slice(contentStart) : raw.slice(contentStart, end);
}

function isPlanStreamingDone(raw: string): boolean {
  return raw.includes(PLAN_END);
}

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#7C6FFD] underline underline-offset-2 hover:text-[#9D8FFD] transition-colors"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="text-base font-semibold text-[#EDEDEF] mt-5 mb-2 first:mt-0 pb-1 border-b border-[#27272B]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-[#EDEDEF] mt-5 mb-2 first:mt-0 flex items-center gap-2">
      <span className="w-1 h-4 rounded-full bg-[#7C6FFD]/60 shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium text-[#EDEDEF] mt-3.5 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-[#C4C4CE] leading-relaxed mb-2.5 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1.5 pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1.5 pl-0 list-none">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2.5 text-sm text-[#C4C4CE] leading-relaxed">
      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#7C6FFD]/50 mt-[0.45rem]" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#EDEDEF]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[#88889A]">{children}</em>
  ),
  code: ({ children }) => (
    <code className="bg-[#18181C] px-1.5 py-0.5 rounded text-xs font-mono text-[#A78BFA] border border-[#27272B]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-[#111114] border border-[#27272B] rounded-xl p-4 mb-3 overflow-x-auto text-xs font-mono">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#7C6FFD]/40 pl-4 py-0.5 my-3 text-[#88889A] italic bg-[#7C6FFD]/5 rounded-r-lg pr-3">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-[#27272B] my-4" />,
};

export function MissionControlPanel({
  workspaceSlug,
  projects,
  initialNorthStar,
  totalTickets,
}: Props) {
  const { getToken } = useAuth();
  const [northStar, setNorthStar] = useState(initialNorthStar);
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [planContent, setPlanContent] = useState("");
  const [misaligned, setMisaligned] = useState<MisalignedTicketEvent[]>([]);
  const [proposed, setProposed] = useState<ProposedTicketEvent[]>([]);
  const [alignedCount, setAlignedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawBufferRef = useRef<string>("");

  const saveNorthStar = useCallback(
    async (value: string) => {
      const t = await getToken();
      if (!t) return;
      try {
        await apiClient(`/api/v1/workspaces/${workspaceSlug}`, {
          method: "PATCH",
          token: t,
          body: JSON.stringify({ workspace: { context: { north_star: value } } }),
        });
      } catch {
        // non-critical — ignore
      }
    },
    [workspaceSlug, getToken]
  );

  function handleNorthStarChange(value: string) {
    setNorthStar(value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveNorthStar(value), 1200);
  }

  async function handleDistill() {
    if (!northStar.trim() || phase === "streaming") return;

    setPhase("streaming");
    setPhaseLabel("Connecting...");
    setPlanContent("");
    setMisaligned([]);
    setProposed([]);
    setAlignedCount(0);
    setError(null);
    rawBufferRef.current = "";

    const t = await getToken();
    if (!t) { setPhase("idle"); return; }

    await streamDistillation({
      workspaceSlug,
      northStar: northStar.trim(),
      token: t,
      onPhase: (label) => setPhaseLabel(label),
      onChunk: (chunk) => {
        rawBufferRef.current += chunk;
        setPlanContent(extractPlanContent(rawBufferRef.current));
      },
      onPlanDone: () => setPhaseLabel("Building signal panel..."),
      onMisalignedTicket: (t) => setMisaligned((prev) => [...prev, t]),
      onProposedTicket: (t) => setProposed((prev) => [...prev, t]),
      onDistillationCreated: () => {
        // Calculate aligned count: total non-done tickets minus misaligned
        setMisaligned((currentMisaligned) => {
          setAlignedCount(Math.max(0, totalTickets - currentMisaligned.length));
          return currentMisaligned;
        });
      },
      onDone: () => setPhase("complete"),
      onError: (err) => {
        setError(err);
        setPhase("idle");
      },
    });
  }

  const isStreaming = phase === "streaming";
  const isPlanDone = isPlanStreamingDone(rawBufferRef.current);

  return (
    <div className="flex h-full bg-[#0C0C0E]">
      {/* Left panel — 60% */}
      <div className="flex flex-col" style={{ width: "60%" }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#27272B] shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#7C6FFD] text-base leading-none">◎</span>
            <h1 className="text-sm font-semibold text-[#EDEDEF]">Mission Control</h1>
          </div>
          <p className="text-xs text-[#4A4A5A]">
            Set your north star. The AI will restructure your entire workspace around it.
          </p>
        </div>

        {/* North star input */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-[#27272B]">
          <label className="block text-xs font-medium text-[#88889A] mb-2">
            What are you focused on right now?
          </label>
          <textarea
            value={northStar}
            onChange={(e) => handleNorthStarChange(e.target.value)}
            placeholder="e.g. Ship social login and a billing page before Series A in 6 weeks. Fix the onboarding drop-off at step 2."
            rows={3}
            disabled={isStreaming}
            className="w-full bg-[#111114] border border-[#27272B] rounded-xl px-4 py-3 text-sm text-[#EDEDEF] placeholder-[#4A4A5A] resize-none outline-none focus:border-[#7C6FFD]/40 focus:ring-1 focus:ring-[#7C6FFD]/10 transition-all disabled:opacity-50 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-[#4A4A5A]">
              {isStreaming ? phaseLabel : "Auto-saved on typing"}
            </p>
            <button
              onClick={handleDistill}
              disabled={!northStar.trim() || isStreaming}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C6FFD] text-white text-sm font-medium rounded-xl hover:bg-[#6B5EEC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Distilling...
                </>
              ) : (
                <>◎ Distill to Plan</>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Plan content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!planContent && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
              <div className="w-12 h-12 rounded-2xl bg-[#7C6FFD]/10 border border-[#7C6FFD]/20 flex items-center justify-center mb-4">
                <span className="text-[#7C6FFD] text-xl leading-none">◎</span>
              </div>
              <h2 className="text-base font-semibold text-[#EDEDEF] mb-1.5">Your plan will appear here</h2>
              <p className="text-sm text-[#88889A] max-w-xs leading-relaxed">
                Type your focus above and click &ldquo;Distill to Plan&rdquo; to restructure your workspace around your north star.
              </p>
            </div>
          )}
          {isStreaming && !planContent && (
            <div className="flex gap-1 pt-2">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-[#4A4A5A] animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}
          {planContent && (
            <div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {planContent}
              </ReactMarkdown>
              {isStreaming && !isPlanDone && (
                <span className="inline-block w-1.5 h-3.5 bg-[#7C6FFD] ml-0.5 rounded-sm align-middle animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-[#27272B] shrink-0" />

      {/* Right panel — 40% */}
      <div className="flex flex-col" style={{ width: "40%" }}>
        <div className="px-5 pt-5 pb-3 border-b border-[#27272B] shrink-0">
          <h2 className="text-xs font-semibold text-[#88889A] uppercase tracking-wider">Signal Panel</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <SignalPanel
            workspaceSlug={workspaceSlug}
            projects={projects}
            alignedCount={alignedCount}
            misaligned={misaligned}
            proposed={proposed}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
