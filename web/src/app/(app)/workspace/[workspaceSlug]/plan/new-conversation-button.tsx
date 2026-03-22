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
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Planning Session"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {activeProjectId && projects.length > 0 && (
        <span className="text-xs text-gray-500 border rounded px-2 py-1">
          {projects.find((p) => p.id === activeProjectId)?.name ?? "project"}
        </span>
      )}

      {conversations.length > 0 && (
        <button
          onClick={() => { setShowPicker(!showPicker); setShowNew(false); }}
          className="text-xs text-gray-500 hover:text-gray-800 border rounded px-2 py-1"
        >
          {conversations.length} session{conversations.length !== 1 ? "s" : ""} ▾
        </button>
      )}

      <button
        onClick={() => { setShowNew(!showNew); setShowPicker(false); }}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        + New
      </button>

      {showNew && (
        <div className="absolute right-0 top-8 z-10 bg-white border rounded-lg shadow-lg w-64 p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">New planning session</p>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full text-xs border rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="w-full text-xs py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Start session"}
          </button>
        </div>
      )}

      {showPicker && (
        <div className="absolute right-0 top-8 z-10 bg-white border rounded-lg shadow-lg w-56 py-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                router.push(`/workspace/${workspaceSlug}/plan?cid=${c.id}`);
                setShowPicker(false);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 truncate"
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
