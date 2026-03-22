"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Project {
  id: string;
  name: string;
}

interface Props {
  workspaceSlug: string;
  conversations: { id: string; title: string }[];
  projects: Project[];
  primary?: boolean;
  activeProjectId?: string;
}

export function NewConversationButton({
  workspaceSlug,
  conversations,
  projects,
  primary,
  activeProjectId,
}: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId ?? projects[0]?.id ?? "");

  async function createConversation() {
    setLoading(true);
    const token = await getToken();
    const res = await fetch(
      `${API_BASE}/api/v1/workspaces/${workspaceSlug}/conversations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation: {
            title: "New Planning Session",
            project_id: selectedProjectId || null,
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const params = new URLSearchParams({ cid: data.data.id });
      if (selectedProjectId) params.set("pid", selectedProjectId);
      router.push(`/workspace/${workspaceSlug}/plan?${params}`);
      router.refresh();
    }
    setLoading(false);
    setShowNew(false);
  }

  if (primary) {
    return (
      <div className="flex flex-col items-center gap-3">
        {projects.length > 0 && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-sm bg-[#111114] border border-[#27272B] rounded-xl px-3 py-2 text-[#88889A] focus:outline-none focus:border-[#7C6FFD]/50 focus:ring-1 focus:ring-[#7C6FFD]/20 transition-all"
          >
            <option value="">No project (chat only)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={createConversation}
          disabled={loading}
          className="px-5 py-2.5 bg-[#7C6FFD] text-white text-sm font-medium rounded-xl hover:bg-[#6B5EEC] disabled:opacity-50 transition-colors"
        >
          {loading ? "Starting..." : "Start Planning Session"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {conversations.length > 0 && (
        <button
          onClick={() => { setShowPicker(!showPicker); setShowNew(false); }}
          className="text-xs text-[#88889A] hover:text-[#EDEDEF] border border-[#27272B] rounded-lg px-2.5 py-1.5 hover:border-[#3A3A42] transition-all"
        >
          {conversations.length} session{conversations.length !== 1 ? "s" : ""} ▾
        </button>
      )}

      <button
        onClick={() => { setShowNew(!showNew); setShowPicker(false); }}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] disabled:opacity-50 transition-colors"
      >
        + New
      </button>

      {showNew && (
        <div className="absolute right-0 top-9 z-10 bg-[#111114] border border-[#27272B] rounded-xl shadow-2xl shadow-black/40 w-64 p-3">
          <p className="text-xs font-medium text-[#88889A] mb-2">New planning session</p>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full text-xs bg-[#18181C] border border-[#27272B] rounded-lg px-2.5 py-1.5 mb-2.5 text-[#88889A] focus:outline-none focus:border-[#7C6FFD]/50 transition-all"
          >
            <option value="">No project (chat only)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={createConversation}
            disabled={loading}
            className="w-full text-xs py-2 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "Creating..." : "Start session"}
          </button>
        </div>
      )}

      {showPicker && (
        <div className="absolute right-0 top-9 z-10 bg-[#111114] border border-[#27272B] rounded-xl shadow-2xl shadow-black/40 w-56 py-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                router.push(`/workspace/${workspaceSlug}/plan?cid=${c.id}`);
                setShowPicker(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#88889A] hover:bg-[#18181C] hover:text-[#EDEDEF] truncate transition-colors"
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
