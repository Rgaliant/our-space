import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { TicketDetail } from "./ticket-detail";
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
  priority_score: number | null;
  story_points: number | null;
  project_id: string;
  spec_id: string | null;
  cycle_id: string | null;
  labels: Label[];
  created_at: string;
  updated_at: string;
}

interface Spec {
  id: string;
  title: string;
  content: string;
}

interface Cycle {
  id: string;
  name: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string; projectId: string; ticketId: string }>;
}

export default async function TicketPage({ params }: PageProps) {
  const { workspaceSlug, projectId, ticketId } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let ticket: Ticket | null = null;
  let spec: Spec | null = null;
  let project: Project | null = null;
  let cycles: Cycle[] = [];
  let workspaceLabels: Label[] = [];

  try {
    const [ticketRes, projectRes, cyclesRes, labelsRes] = await Promise.all([
      apiClient<{ data: Ticket }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/tickets/${ticketId}`,
        { token: token ?? undefined }
      ),
      apiClient<{ data: Project }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        { token: token ?? undefined }
      ),
      apiClient<{ data: Cycle[] }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles`,
        { token: token ?? undefined }
      ),
      apiClient<{ data: Label[] }>(
        `/api/v1/workspaces/${workspaceSlug}/labels`,
        { token: token ?? undefined }
      ),
    ]);
    ticket = ticketRes.data;
    project = projectRes.data;
    cycles = cyclesRes.data;
    workspaceLabels = labelsRes.data;

    if (ticket.spec_id) {
      const specRes = await apiClient<{ data: Spec }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/specs/${ticket.spec_id}`,
        { token: token ?? undefined }
      );
      spec = specRes.data;
    }
  } catch {
    redirect(`/workspace/${workspaceSlug}/projects/${projectId}/board`);
  }

  if (!ticket) redirect(`/workspace/${workspaceSlug}/projects/${projectId}/board`);

  return (
    <div className="flex flex-col h-full bg-[#0C0C0E]" style={{ height: "calc(100vh - 49px)" }}>
      {/* Breadcrumb */}
      <div className="border-b border-[#27272B] bg-[#0C0C0E] px-6 py-3 flex items-center gap-2 text-xs text-[#4A4A5A] shrink-0">
        <Link
          href={`/workspace/${workspaceSlug}/projects/${projectId}/board`}
          className="hover:text-[#88889A] transition-colors"
        >
          {project?.name ?? "Board"}
        </Link>
        <span>/</span>
        <span className="text-[#88889A] truncate max-w-xs">{ticket.title}</span>
      </div>

      <TicketDetail
        ticket={ticket}
        spec={spec}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        cycles={cycles}
        workspaceLabels={workspaceLabels}
      />
    </div>
  );
}
