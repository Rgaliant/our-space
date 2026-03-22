import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { CycleCreateForm } from "./cycle-create-form";

interface Cycle {
  id: string;
  name: string;
  status: "upcoming" | "active" | "completed";
  start_date: string;
  end_date: string;
  ticket_count: number;
}

interface Project {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

const STATUS_STYLES = {
  upcoming: "text-[#88889A] bg-[#27272B] border-[#3A3A42]",
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  completed: "text-[#4A4A5A] bg-[#111114] border-[#27272B]",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function CyclesPage({ params }: PageProps) {
  const { workspaceSlug, projectId } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let cycles: Cycle[] = [];
  let project: Project | null = null;
  try {
    const [cyclesRes, projectRes] = await Promise.all([
      apiClient<{ data: Cycle[] }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles`,
        { token: token ?? undefined }
      ),
      apiClient<{ data: Project }>(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        { token: token ?? undefined }
      ),
    ]);
    cycles = cyclesRes.data;
    project = projectRes.data;
  } catch {
    redirect(`/workspace/${workspaceSlug}/projects/${projectId}/board`);
  }

  const active = cycles.filter((c) => c.status === "active");
  const upcoming = cycles.filter((c) => c.status === "upcoming");
  const completed = cycles.filter((c) => c.status === "completed");

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#4A4A5A] mb-1">
            <Link href={`/workspace/${workspaceSlug}/projects/${projectId}/board`} className="hover:text-[#88889A] transition-colors">
              {project?.name}
            </Link>
            <span>/</span>
            <span className="text-[#88889A]">Cycles</span>
          </div>
          <h1 className="text-base font-semibold text-[#EDEDEF]">Cycles</h1>
        </div>
        <CycleCreateForm workspaceSlug={workspaceSlug} projectId={projectId} />
      </div>

      {cycles.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#27272B] rounded-2xl">
          <p className="text-sm text-[#88889A] mb-1">No cycles yet</p>
          <p className="text-xs text-[#4A4A5A]">Create a cycle to group time-boxed work into sprints.</p>
        </div>
      )}

      {active.length > 0 && <CycleSection title="Active" cycles={active} workspaceSlug={workspaceSlug} projectId={projectId} statusStyles={STATUS_STYLES} />}
      {upcoming.length > 0 && <CycleSection title="Upcoming" cycles={upcoming} workspaceSlug={workspaceSlug} projectId={projectId} statusStyles={STATUS_STYLES} />}
      {completed.length > 0 && <CycleSection title="Completed" cycles={completed} workspaceSlug={workspaceSlug} projectId={projectId} statusStyles={STATUS_STYLES} />}
    </div>
  );
}

function CycleSection({ title, cycles, workspaceSlug, projectId, statusStyles }: {
  title: string;
  cycles: Cycle[];
  workspaceSlug: string;
  projectId: string;
  statusStyles: Record<string, string>;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold text-[#4A4A5A] uppercase tracking-wider mb-3">{title}</p>
      <div className="flex flex-col gap-2">
        {cycles.map((cycle) => (
          <div key={cycle.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#27272B] bg-[#111114] hover:border-[#3A3A42] transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${statusStyles[cycle.status]}`}>
                {cycle.status}
              </span>
              <span className="text-sm font-medium text-[#EDEDEF] truncate">{cycle.name}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              <span className="text-xs text-[#4A4A5A]">
                {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
              </span>
              <span className="text-xs text-[#88889A]">{cycle.ticket_count} tickets</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
