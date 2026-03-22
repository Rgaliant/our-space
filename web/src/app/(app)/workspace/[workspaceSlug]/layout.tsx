import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { apiClient } from "@/lib/api";

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
      <nav className="w-52 border-r bg-gray-50 flex flex-col shrink-0">
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/workspaces"
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            ← workspaces
          </Link>
          <p className="text-xs font-semibold text-gray-700 mt-3 uppercase tracking-wider">
            {workspaceSlug}
          </p>
        </div>

        <div className="flex flex-col gap-0.5 px-2 mt-2">
          <NavLink href={`/workspace/${workspaceSlug}/plan`} label="Planning Mode" icon="✦" />
          <NavLink href={`/workspace/${workspaceSlug}/engineer`} label="Engineer Brief" icon="⚡" />
        </div>

        {projects.length > 0 && (
          <div className="mt-4 px-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Boards
            </p>
            <div className="flex flex-col gap-0.5">
              {projects.map((project) => (
                <NavLink
                  key={project.id}
                  href={`/workspace/${workspaceSlug}/projects/${project.id}/board`}
                  label={project.name}
                  icon="▦"
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
    >
      <span className="text-xs">{icon}</span>
      {label}
    </Link>
  );
}
