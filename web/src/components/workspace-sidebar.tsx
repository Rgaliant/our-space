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
    router.push(m === "product" ? `/workspace/${workspaceSlug}/plan` : `/workspace/${workspaceSlug}/engineer`);
  }

  function toggleMode() {
    chooseMode(mode === "product" ? "engineer" : "product");
  }

  if (mode === null) {
    return (
      <nav className="w-52 border-r border-[#27272B] bg-[#0C0C0E] shrink-0">
        <ModePicker workspaceSlug={workspaceSlug} onChoose={chooseMode} />
      </nav>
    );
  }

  return (
    <nav className="w-52 border-r border-[#27272B] bg-[#0C0C0E] flex flex-col shrink-0">
      <div className="px-4 pt-4 pb-3">
        <Link href="/workspaces" className="text-xs text-[#4A4A5A] hover:text-[#88889A] flex items-center gap-1 transition-colors">
          ← workspaces
        </Link>
        <p className="text-xs font-semibold text-[#88889A] mt-3 uppercase tracking-wider truncate">
          {workspaceSlug}
        </p>
      </div>

      <div className="flex flex-col gap-0.5 px-2 flex-1">
        {mode === "product" ? (
          <>
            <NavLink href={`/workspace/${workspaceSlug}/plan`} label="Planning" icon="✦" active={pathname.startsWith(`/workspace/${workspaceSlug}/plan`)} accent="violet" />
            {projects.length > 0 && (
              <>
                <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider px-3 pt-4 pb-1.5">Boards</p>
                {projects.map((p) => (
                  <NavLink key={p.id} href={`/workspace/${workspaceSlug}/projects/${p.id}/board`} label={p.name} icon="▦" active={pathname.includes(`/projects/${p.id}/board`)} accent="violet" />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <NavLink href={`/workspace/${workspaceSlug}/engineer`} label="Daily Brief" icon="⚡" active={pathname.startsWith(`/workspace/${workspaceSlug}/engineer`)} accent="amber" />
            {projects.length > 0 && (
              <>
                <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider px-3 pt-4 pb-1.5">Boards</p>
                {projects.map((p) => (
                  <NavLink key={p.id} href={`/workspace/${workspaceSlug}/projects/${p.id}/board`} label={p.name} icon="▦" active={pathname.includes(`/projects/${p.id}/board`)} accent="amber" />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className="px-3 py-3 border-t border-[#27272B] mt-auto">
        <button
          onClick={toggleMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#111114] border border-[#27272B] hover:border-[#3A3A42] transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{mode === "product" ? "✦" : "⚡"}</span>
            <span className={`text-xs font-medium capitalize ${mode === "product" ? "text-[#7C6FFD]" : "text-[#F59E0B]"}`}>
              {mode}
            </span>
          </div>
          <span className="text-xs text-[#4A4A5A] group-hover:text-[#88889A] transition-colors">switch</span>
        </button>
      </div>
    </nav>
  );
}

function NavLink({ href, label, icon, active, accent }: {
  href: string; label: string; icon: string; active: boolean; accent: "violet" | "amber";
}) {
  const activeColor = accent === "violet" ? "text-[#7C6FFD] bg-[#7C6FFD]/10" : "text-[#F59E0B] bg-[#F59E0B]/10";
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
        active ? activeColor : "text-[#88889A] hover:bg-[#18181C] hover:text-[#EDEDEF]"
      }`}
    >
      <span className="text-xs shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function ModePicker({ workspaceSlug, onChoose }: { workspaceSlug: string; onChoose: (m: Mode) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0C0C0E] flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-widest mb-3">{workspaceSlug}</p>
          <h1 className="text-2xl font-semibold text-[#EDEDEF] mb-2">How are you working today?</h1>
          <p className="text-sm text-[#88889A]">Choose your focus. You can switch any time from the sidebar.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChoose("product")}
            className="flex flex-col items-start p-6 rounded-2xl border border-[#27272B] bg-[#111114] hover:border-[#7C6FFD]/50 hover:bg-[#7C6FFD]/5 transition-all text-left group"
          >
            <span className="text-3xl mb-4">✦</span>
            <p className="text-sm font-semibold text-[#EDEDEF] mb-1.5 group-hover:text-[#7C6FFD] transition-colors">Product</p>
            <p className="text-xs text-[#4A4A5A] leading-relaxed">Plan features, define specs, manage the roadmap and review boards.</p>
          </button>

          <button
            onClick={() => onChoose("engineer")}
            className="flex flex-col items-start p-6 rounded-2xl border border-[#27272B] bg-[#111114] hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/5 transition-all text-left group"
          >
            <span className="text-3xl mb-4">⚡</span>
            <p className="text-sm font-semibold text-[#EDEDEF] mb-1.5 group-hover:text-[#F59E0B] transition-colors">Engineer</p>
            <p className="text-xs text-[#4A4A5A] leading-relaxed">Get your daily brief, focus on tickets, and use AI to move fast.</p>
          </button>
        </div>

        <p className="text-center text-xs text-[#4A4A5A] mt-6">You can switch modes at any time from the sidebar.</p>
      </div>
    </div>
  );
}
