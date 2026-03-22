import { auth } from "@clerk/nextjs/server";
import { apiClient } from "@/lib/api";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

interface Project {
  id: string;
  name: string;
}

interface Props {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspaceSlug } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let projects: Project[] = [];
  try {
    const res = await apiClient<{ data: Project[] }>(
      `/api/v1/workspaces/${workspaceSlug}/projects`,
      { token: token ?? undefined }
    );
    projects = res.data;
  } catch {
    // workspace not found or API down
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} projects={projects} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
