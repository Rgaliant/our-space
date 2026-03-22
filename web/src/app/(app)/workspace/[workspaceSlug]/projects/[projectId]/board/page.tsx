import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { KanbanBoard } from "@/components/kanban-board";
import Link from "next/link";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  spec_id: string | null;
  project_id: string;
  labels: Label[];
}

interface Project {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { workspaceSlug, projectId } = await params;

  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let tickets: Ticket[] = [];
  let project: Project | null = null;

  try {
    const [ticketsRes, projectRes] = await Promise.all([
      apiClient<{ data: Ticket[] }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets`,
        { token: token ?? undefined }
      ),
      apiClient<{ data: Project }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        { token: token ?? undefined }
      ),
    ]);
    tickets = ticketsRes.data;
    project = projectRes.data;
  } catch {
    // project not found or API down
  }

  return (
    <div className="flex flex-col h-full bg-[#0C0C0E]" style={{ height: "calc(100vh - 49px)" }}>
      <div className="border-b border-[#27272B] bg-[#0C0C0E] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-[#EDEDEF]">{project?.name ?? "Board"}</h1>
          <span className="text-xs text-[#4A4A5A]">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</span>
        </div>
        <Link
          href={`/workspace/${workspaceSlug}/plan?pid=${projectId}`}
          className="text-xs px-3 py-1.5 bg-[#7C6FFD] text-white rounded-lg hover:bg-[#6B5EEC] transition-colors"
        >
          + Plan feature
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0C0C0E]">
          <div className="w-12 h-12 rounded-2xl bg-[#7C6FFD]/10 border border-[#7C6FFD]/20 flex items-center justify-center mb-4">
            <span className="text-[#7C6FFD] text-xl leading-none">▦</span>
          </div>
          <h2 className="text-base font-semibold text-[#EDEDEF] mb-1.5">No tickets yet</h2>
          <p className="text-sm text-[#88889A] max-w-xs leading-relaxed mb-6">
            Use Planning Mode to have a conversation with Claude — it will generate a spec and
            create tickets here automatically.
          </p>
          <Link
            href={`/workspace/${workspaceSlug}/plan?pid=${projectId}`}
            className="px-5 py-2.5 bg-[#7C6FFD] text-white text-sm font-medium rounded-xl hover:bg-[#6B5EEC] transition-colors"
          >
            Start Planning Session
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <KanbanBoard
            initialTickets={tickets}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
        </div>
      )}
    </div>
  );
}
