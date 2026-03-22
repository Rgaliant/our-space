"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Props {
  workspaceSlug: string;
  conversations: { id: string; title: string }[];
  primary?: boolean;
}

export function NewConversationButton({ workspaceSlug, conversations, primary }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function createConversation(title: string) {
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
        body: JSON.stringify({ conversation: { title } }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      router.push(`/workspace/${workspaceSlug}/plan?cid=${data.data.id}`);
      router.refresh();
    }
    setLoading(false);
    setShowPicker(false);
  }

  if (primary) {
    return (
      <button
        onClick={() => createConversation("New Planning Session")}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Planning Session"}
      </button>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {conversations.length > 0 && (
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-gray-500 hover:text-gray-800 border rounded px-2 py-1"
        >
          {conversations.length} session{conversations.length !== 1 ? "s" : ""} ▾
        </button>
      )}
      <button
        onClick={() => createConversation("New Planning Session")}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "..." : "+ New"}
      </button>

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
