"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function PrioritizeButton({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId: string;
}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handlePrioritize() {
    setLoading(true);
    try {
      const token = await getToken();
      await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/ai/prioritize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePrioritize}
      disabled={loading || done}
      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all disabled:opacity-50 ${
        done
          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          : "border-[#27272B] text-[#88889A] hover:border-[#7C6FFD]/40 hover:text-[#7C6FFD] hover:bg-[#7C6FFD]/5"
      }`}
    >
      {loading ? "Scoring..." : done ? "Scored ✓" : "AI Prioritize"}
    </button>
  );
}
