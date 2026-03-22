import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { KanbanBoard } from "@/components/kanban-board";
import Link from "next/link";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  spec_id: string | null;
  project_id: string;
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
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 49px)" }}>
      <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">{project?.name ?? "Board"}</h1>
          <span className="text-xs text-gray-400">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</span>
        </div>
        <Link
          href={`/workspace/${workspaceSlug}/plan?pid=${projectId}`}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Plan feature
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-3xl mb-3">▦</div>
          <h2 className="text-xl font-semibold mb-2">No tickets yet</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Use Planning Mode to have a conversation with Claude — it will generate a spec and
            create tickets here automatically.
          </p>
          <Link
            href={`/workspace/${workspaceSlug}/plan?pid=${projectId}`}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
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
