import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api";
import { LabelsManager } from "./labels-manager";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function LabelsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let labels: Label[] = [];
  try {
    const res = await apiClient<{ data: Label[] }>(
      `/api/v1/workspaces/${workspaceSlug}/labels`,
      { token: token ?? undefined }
    );
    labels = res.data;
  } catch {
    // workspace not found
  }

  return (
    <div className="flex flex-col h-full bg-[#0C0C0E]" style={{ height: "calc(100vh - 49px)" }}>
      <div className="border-b border-[#27272B] bg-[#0C0C0E] px-6 py-3 shrink-0">
        <h1 className="text-sm font-semibold text-[#EDEDEF]">Labels</h1>
        <p className="text-xs text-[#4A4A5A] mt-0.5">Manage workspace-level labels for categorizing tickets</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <LabelsManager workspaceSlug={workspaceSlug} initialLabels={labels} />
      </div>
    </div>
  );
}
