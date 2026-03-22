"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Project {
  id: string;
  name: string;
}

interface Props {
  workspaceSlug: string;
  projects: Project[];
  activeProjectId?: string;
  conversationId?: string;
}

export function ProjectSelector({ workspaceSlug, projects, activeProjectId, conversationId }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  function selectProject(pid: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (pid) {
      params.set("pid", pid);
    } else {
      params.delete("pid");
    }
    if (conversationId) params.set("cid", conversationId);
    router.push(`/workspace/${workspaceSlug}/plan?${params}`);
  }

  async function createProject() {
    if (!newName.trim()) return;
    setLoading(true);
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspaceSlug}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ project: { name: newName.trim() } }),
    });
    if (res.ok) {
      const data = await res.json();
      setCreating(false);
      setNewName("");
      router.refresh();
      selectProject(data.data.id);
    }
    setLoading(false);
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createProject();
            if (e.key === "Escape") { setCreating(false); setNewName(""); }
          }}
          placeholder="Project name"
          className="text-xs border rounded px-2 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={createProject}
          disabled={loading || !newName.trim()}
          className="text-xs px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Create"}
        </button>
        <button
          onClick={() => { setCreating(false); setNewName(""); }}
          className="text-xs px-2 py-1.5 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {projects.length > 0 ? (
        <select
          value={activeProjectId ?? ""}
          onChange={(e) => selectProject(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-gray-400">No projects yet</span>
      )}
      <button
        onClick={() => setCreating(true)}
        className="text-xs text-blue-600 hover:text-blue-800 px-1"
        title="New project"
      >
        + project
      </button>
    </div>
  );
}
