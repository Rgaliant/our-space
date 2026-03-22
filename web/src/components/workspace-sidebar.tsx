"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
}

interface Props {
  workspaceSlug: string;
  projects: Project[];
}

type Mode = "product" | "engineer";

function storageKey(slug: string) {
  return `workspace_mode_${slug}`;
}

export function WorkspaceSidebar({ workspaceSlug, projects }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(workspaceSlug)) as Mode | null;
    setMode(stored);
  }, [workspaceSlug]);

  function chooseMode(m: Mode) {
    localStorage.setItem(storageKey(workspaceSlug), m);
    setMode(m);
    const home = m === "product"
      ? `/workspace/${workspaceSlug}/plan`
      : `/workspace/${workspaceSlug}/engineer`;
    router.push(home);
  }

  function toggleMode() {
    const next: Mode = mode === "product" ? "engineer" : "product";
    chooseMode(next);
  }

  // Don't render nav until we've read localStorage (avoids flash)
  if (mode === null) {
    return (
      <nav className="w-52 border-r bg-gray-50 shrink-0">
        <ModePicker workspaceSlug={workspaceSlug} onChoose={chooseMode} />
      </nav>
    );
  }

  return (
    <nav className="w-52 border-r bg-gray-50 flex flex-col shrink-0">
      {/* Workspace name */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/workspaces"
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← workspaces
        </Link>
        <p className="text-xs font-semibold text-gray-700 mt-3 uppercase tracking-wider truncate">
          {workspaceSlug}
        </p>
      </div>

      {/* Role nav */}
      <div className="flex flex-col gap-0.5 px-2 mt-2 flex-1">
        {mode === "product" ? (
          <>
            <NavLink
              href={`/workspace/${workspaceSlug}/plan`}
              label="Planning Mode"
              icon="✦"
              active={pathname.startsWith(`/workspace/${workspaceSlug}/plan`)}
            />
            {projects.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
                  Boards
                </p>
                {projects.map((p) => (
                  <NavLink
                    key={p.id}
                    href={`/workspace/${workspaceSlug}/projects/${p.id}/board`}
                    label={p.name}
                    icon="▦"
                    active={pathname.includes(`/projects/${p.id}/board`)}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <NavLink
              href={`/workspace/${workspaceSlug}/engineer`}
              label="Daily Brief"
              icon="⚡"
              active={pathname.startsWith(`/workspace/${workspaceSlug}/engineer`)}
            />
            {projects.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
                  Boards
                </p>
                {projects.map((p) => (
                  <NavLink
                    key={p.id}
                    href={`/workspace/${workspaceSlug}/projects/${p.id}/board`}
                    label={p.name}
                    icon="▦"
                    active={pathname.includes(`/projects/${p.id}/board`)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Mode switcher */}
      <div className="px-3 py-3 border-t mt-auto">
        <button
          onClick={toggleMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{mode === "product" ? "✦" : "⚡"}</span>
            <span className="text-xs font-medium text-gray-700 capitalize">{mode}</span>
          </div>
          <span className="text-xs text-gray-400 group-hover:text-gray-600">switch</span>
        </button>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
        active
          ? "bg-gray-200 text-gray-900 font-medium"
          : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }`}
    >
      <span className="text-xs shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function ModePicker({
  workspaceSlug,
  onChoose,
}: {
  workspaceSlug: string;
  onChoose: (mode: Mode) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {workspaceSlug}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">How are you working today?</h1>
          <p className="text-sm text-gray-500">
            Choose your focus. You can switch any time from the sidebar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onChoose("product")}
            className="group flex flex-col items-start p-6 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
          >
            <span className="text-3xl mb-4">✦</span>
            <p className="text-base font-semibold text-gray-900 mb-1.5">Product</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Plan features, define specs, manage the roadmap and review boards.
            </p>
          </button>

          <button
            onClick={() => onChoose("engineer")}
            className="group flex flex-col items-start p-6 rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
          >
            <span className="text-3xl mb-4">⚡</span>
            <p className="text-base font-semibold text-gray-900 mb-1.5">Engineer</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Get your daily brief, focus on tickets, and use AI to move fast.
            </p>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          You can enable both modes and switch between them at any time.
        </p>
      </div>
    </div>
  );
}
