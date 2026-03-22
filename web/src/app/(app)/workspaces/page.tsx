"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function WorkspacesPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadWorkspaces(); }, []);

  async function loadWorkspaces() {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setWorkspaces(data.data);
      if (data.data.length === 1) { router.replace(`/workspace/${data.data[0].slug}/plan`); return; }
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workspace: { name: newName.trim(), plan: "free" } }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/workspace/${data.data.slug}/plan`);
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.error?.message || `Failed (${res.status})`);
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#4A4A5A] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-widest mb-3">our-space</p>
          <h1 className="text-xl font-semibold text-[#EDEDEF] mb-1.5">Your Workspaces</h1>
          <p className="text-sm text-[#88889A]">Select or create a workspace</p>
        </div>

        {workspaces.length > 0 && (
          <div className="space-y-1.5 mb-6">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/workspace/${ws.slug}/plan`)}
                className="w-full text-left px-4 py-3 rounded-xl border border-[#27272B] bg-[#111114] hover:bg-[#18181C] hover:border-[#3A3A42] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[#EDEDEF]">{ws.name}</span>
                  <span className="text-xs text-[#4A4A5A] group-hover:text-[#88889A] transition-colors">→</span>
                </div>
                <div className="text-xs text-[#4A4A5A] mt-0.5">{ws.slug} · {ws.plan}</div>
              </button>
            ))}
          </div>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-4 py-2.5 text-sm font-medium text-[#7C6FFD] border border-[#7C6FFD]/30 rounded-xl hover:bg-[#7C6FFD]/10 transition-all"
          >
            + New Workspace
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-2.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Workspace name"
              autoFocus
              className="w-full px-3 py-2.5 text-sm bg-[#111114] border border-[#27272B] rounded-xl text-[#EDEDEF] placeholder-[#4A4A5A] focus:outline-none focus:border-[#7C6FFD]/50 focus:ring-1 focus:ring-[#7C6FFD]/20 transition-all"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#7C6FFD] rounded-xl hover:bg-[#6B5EEC] disabled:opacity-40 transition-all"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewName(""); setError(""); }}
                className="px-4 py-2.5 text-sm text-[#88889A] border border-[#27272B] rounded-xl hover:bg-[#18181C] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
