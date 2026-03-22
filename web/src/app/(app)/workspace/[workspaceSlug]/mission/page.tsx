import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { MissionControlPanel } from "@/components/mission-control-panel";

interface Workspace {
  id: string;
  slug: string;
  context: { north_star?: string } | null;
}

interface Project {
  id: string;
  name: string;
}

interface Ticket {
  id: string;
  status: string;
}

interface Distillation {
  id: string;
  north_star: string;
  plan_content: string | null;
  proposed_tickets: Array<{
    title: string;
    description?: string;
    priority: string;
    story_points?: number;
    project_id?: string;
  }>;
  misaligned_ticket_ids: number[];
  status: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function MissionPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let workspace: Workspace | null = null;
  try {
    const res = await apiClient<{ data: Workspace }>(
      `/api/v1/workspaces/${workspaceSlug}`,
      { token: token ?? undefined }
    );
    workspace = res.data;
  } catch {
    redirect(`/workspace/${workspaceSlug}/plan`);
  }

  let projects: Project[] = [];
  try {
    const res = await apiClient<{ data: Project[] }>(
      `/api/v1/workspaces/${workspaceSlug}/projects`,
      { token: token ?? undefined }
    );
    projects = res.data;
  } catch {
    // no projects yet
  }

  let recentDistillations: Distillation[] = [];
  try {
    const res = await apiClient<{ data: Distillation[] }>(
      `/api/v1/workspaces/${workspaceSlug}/distillations`,
      { token: token ?? undefined }
    );
    recentDistillations = res.data;
  } catch {
    // no distillations yet
  }

  // Load active tickets to compute aligned count
  let totalTickets = 0;
  for (const project of projects) {
    try {
      const res = await apiClient<{ data: Ticket[] }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/tickets`,
        { token: token ?? undefined }
      );
      totalTickets += res.data.filter((t) => t.status !== "done").length;
    } catch {
      // ignore
    }
  }

  const initialNorthStar = workspace?.context?.north_star ?? "";

  return (
    <div className="h-full flex flex-col bg-[#0C0C0E]" style={{ height: "calc(100vh - 49px)" }}>
      <MissionControlPanel
        workspaceSlug={workspaceSlug}
        projects={projects}
        initialNorthStar={initialNorthStar}
        recentDistillations={recentDistillations}
        totalTickets={totalTickets}
      />
    </div>
  );
}
