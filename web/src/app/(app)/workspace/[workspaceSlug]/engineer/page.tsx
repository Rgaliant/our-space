import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PrioritizeButton } from "./prioritize-button";
import Link from "next/link";

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
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  low: "bg-[#27272B] text-[#88889A] border-[#3A3A42]",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export default async function EngineerPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let projects: Project[] = [];
  try {
    const res = await apiClient<{ data: Project[] }>(
      `/api/v1/workspaces/${workspaceSlug}/projects`,
      { token: token ?? undefined }
    );
    projects = res.data.filter((p) => p.status === "active");
  } catch {
    // no projects
  }

  const projectTickets = await Promise.all(
    projects.map(async (project) => {
      try {
        const res = await apiClient<{ data: Ticket[] }>(
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/tickets`,
          { token: token ?? undefined }
        );
        return { project, tickets: res.data };
      } catch {
        return { project, tickets: [] };
      }
    })
  );

  const activeTickets = projectTickets
    .flatMap(({ project, tickets }) =>
      tickets
        .filter((t) => t.status !== "done" && t.status !== "backlog")
        .map((t) => ({ ...t, projectName: project.name }))
    )
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

  return (
    <div className="flex-1 overflow-y-auto bg-[#0C0C0E]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-base font-semibold text-[#EDEDEF]">Daily Brief</h1>
          <p className="text-sm text-[#88889A] mt-1">
            {activeTickets.length > 0
              ? `${activeTickets.length} ticket${activeTickets.length !== 1 ? "s" : ""} in progress`
              : "Nothing in progress — pick something from the backlog."}
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#4A4A5A]">No active projects yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeTickets.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider mb-3">
                  In Progress
                </h2>
                <div className="space-y-1.5">
                  {activeTickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      workspaceSlug={workspaceSlug}
                      projectName={ticket.projectName}
                    />
                  ))}
                </div>
              </section>
            )}

            {projectTickets.map(({ project, tickets }) => {
              const backlog = tickets
                .filter((t) => t.status === "backlog")
                .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

              return (
                <section key={project.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider">
                      {project.name} — Backlog
                    </h2>
                    <div className="flex items-center gap-2">
                      <PrioritizeButton workspaceSlug={workspaceSlug} projectId={project.id} />
                    </div>
                  </div>

                  {backlog.length === 0 ? (
                    <p className="text-xs text-[#4A4A5A] py-2">
                      No backlog tickets.{" "}
                      <Link
                        href={`/workspace/${workspaceSlug}/plan?pid=${project.id}`}
                        className="text-[#7C6FFD] hover:text-[#6B5EEC] transition-colors"
                      >
                        Plan a feature →
                      </Link>
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {backlog.map((ticket) => (
                        <TicketRow
                          key={ticket.id}
                          ticket={ticket}
                          workspaceSlug={workspaceSlug}
                          projectName={project.name}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({
  ticket,
  workspaceSlug,
  projectName,
}: {
  ticket: Ticket & { projectName?: string };
  workspaceSlug: string;
  projectName: string;
}) {
  return (
    <Link
      href={`/workspace/${workspaceSlug}/projects/${ticket.project_id}/tickets/${ticket.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-[#111114] border border-[#27272B] rounded-xl hover:border-[#3A3A42] transition-colors group"
    >
      {ticket.priority_score !== null && (
        <div className="shrink-0 w-1 h-8 rounded-full bg-[#27272B] overflow-hidden flex flex-col justify-end">
          <div
            className="w-full bg-[#7C6FFD] rounded-full"
            style={{ height: `${Math.round(ticket.priority_score * 100)}%` }}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#EDEDEF] truncate group-hover:text-[#7C6FFD] transition-colors">
          {ticket.title}
        </p>
        <p className="text-xs text-[#4A4A5A] mt-0.5">{projectName}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[ticket.priority] ?? PRIORITY_STYLES.low}`}>
          {ticket.priority}
        </span>
        <span className="text-xs text-[#4A4A5A] border border-[#27272B] rounded px-1.5 py-0.5">
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </span>
        {ticket.story_points && (
          <span className="text-xs text-[#4A4A5A]">{ticket.story_points}pt</span>
        )}
      </div>
    </Link>
  );
}
