"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function PrioritizeButton({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId: string;
}) {
  const { getToken } = useAuth();
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePrioritize}
      disabled={loading || done}
      className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
    >
      {loading ? "Scoring..." : done ? "Scored!" : "AI Prioritize"}
    </button>
  );
}
