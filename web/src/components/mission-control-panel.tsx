"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
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
  const [token, setToken] = useState<string>("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const t = await getToken();
    if (!t) { setPhase("idle"); return; }
    setToken(t);

    await streamDistillation({
      workspaceSlug,
      northStar: northStar.trim(),
      token: t,
      onPhase: (label) => setPhaseLabel(label),
      onChunk: (chunk) => setPlanContent((prev) => prev + chunk),
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

  // Post-stream aligned count fix
  const isStreaming = phase === "streaming";

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
            <div className="text-sm text-[#D4D4DE] leading-relaxed
              [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-[#EDEDEF] [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:first:mt-0
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-[#EDEDEF] [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:first:mt-0
              [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-[#EDEDEF] [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:first:mt-0
              [&_p]:mb-2 [&_p:last-child]:mb-0
              [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:space-y-1 [&_ul]:list-disc [&_ul]:marker:text-[#7C6FFD]/50
              [&_ol]:mb-2 [&_ol]:pl-4 [&_ol]:space-y-1 [&_ol]:list-decimal
              [&_li]:text-[#C4C4CE]
              [&_strong]:font-semibold [&_strong]:text-[#EDEDEF]
              [&_em]:italic [&_em]:text-[#88889A]
              [&_code]:bg-[#18181C] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-[#A78BFA] [&_code]:border [&_code]:border-[#27272B]
              [&_blockquote]:border-l-2 [&_blockquote]:border-[#7C6FFD]/30 [&_blockquote]:pl-3 [&_blockquote]:text-[#88889A] [&_blockquote]:italic
              [&_hr]:border-[#27272B] [&_hr]:my-3
            ">
              <ReactMarkdown>{planContent}</ReactMarkdown>
              {isStreaming && (
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
            token={token}
          />
        </div>
      </div>
    </div>
  );
}
