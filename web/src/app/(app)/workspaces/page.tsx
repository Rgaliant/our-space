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

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setWorkspaces(data.data);
      if (data.data.length === 1) {
        router.replace(`/workspace/${data.data[0].slug}/plan`);
        return;
      }
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ workspace: { name: newName.trim(), plan: "free" } }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/workspace/${data.data.slug}/plan`);
    } else {
      const err = await res.json().catch(() => null);
      setError(err?.error?.message || `Failed to create workspace (${res.status})`);
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-2">Your Workspaces</h1>
      <p className="text-gray-500 text-sm mb-8">Select a workspace to get started</p>

      {workspaces.length > 0 && (
        <div className="w-full max-w-md space-y-2 mb-6">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => router.push(`/workspace/${ws.slug}/plan`)}
              className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm">{ws.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{ws.slug} · {ws.plan}</div>
            </button>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          + New Workspace
        </button>
      ) : (
        <form onSubmit={handleCreate} className="w-full max-w-md space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name (e.g. Acme Corp)"
            autoFocus
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Workspace"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(""); setError(""); }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
