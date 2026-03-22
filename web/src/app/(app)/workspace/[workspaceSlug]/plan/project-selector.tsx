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
          className="text-xs bg-[#111114] border border-[#27272B] rounded-lg px-2.5 py-1.5 w-36 text-[#EDEDEF] placeholder-[#4A4A5A] focus:outline-none focus:border-[#7C6FFD]/50 focus:ring-1 focus:ring-[#7C6FFD]/20 transition-all"
        />
        <button
          onClick={createProject}
          disabled={loading || !newName.trim()}
          className="text-xs px-2.5 py-1.5 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Create"}
        </button>
        <button
          onClick={() => { setCreating(false); setNewName(""); }}
          className="text-xs px-2.5 py-1.5 border border-[#27272B] rounded-lg text-[#88889A] hover:bg-[#18181C] hover:text-[#EDEDEF] transition-all"
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
          className="text-xs bg-[#111114] border border-[#27272B] rounded-lg px-2.5 py-1.5 text-[#88889A] focus:outline-none focus:border-[#7C6FFD]/50 focus:ring-1 focus:ring-[#7C6FFD]/20 transition-all"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-[#4A4A5A]">No projects yet</span>
      )}
      <button
        onClick={() => setCreating(true)}
        className="text-xs text-[#7C6FFD] hover:text-[#6B5EEC] px-1 transition-colors"
        title="New project"
      >
        + project
      </button>
    </div>
  );
}
