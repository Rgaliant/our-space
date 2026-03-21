import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PrioritizeButton } from "./prioritize-button";

interface Ticket {
  id: string;
  title: string;
  description: string;
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
  slug: string;
  status: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

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
  } catch { /* no projects */ }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Engineer Brief</h1>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500 text-sm">No active projects.</p>
      ) : (
        <div className="space-y-8">
          {projects.map((project) => (
            <ProjectBacklog
              key={project.id}
              project={project}
              workspaceSlug={workspaceSlug}
              token={token ?? ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function ProjectBacklog({
  project,
  workspaceSlug,
  token,
}: {
  project: Project;
  workspaceSlug: string;
  token: string;
}) {
  // We can't easily fetch tickets here without knowing spec IDs upfront
  // so show project with prioritize button only
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <PrioritizeButton
          workspaceSlug={workspaceSlug}
          projectId={project.id}
        />
      </div>
      <p className="text-sm text-gray-500">
        Use the prioritize button to score backlog tickets with AI, then view tickets in the project.
      </p>
    </div>
  );
}
