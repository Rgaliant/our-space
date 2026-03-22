import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PlanningChat } from "@/components/planning-chat";
import { NewConversationButton } from "./new-conversation-button";
import { ProjectSelector } from "./project-selector";
import { apiClient } from "@/lib/api";

interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ cid?: string; pid?: string }>;
}

export default async function PlanPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { cid, pid } = await searchParams;

  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");
  const token = await getToken();

  let conversations: Conversation[] = [];
  try {
    const res = await apiClient<{ data: Conversation[] }>(
      `/api/v1/workspaces/${workspaceSlug}/conversations`,
      { token: token ?? undefined }
    );
    conversations = res.data;
  } catch {
    // no conversations yet
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

  const activeConversation =
    conversations.find((c) => c.id === cid) ?? conversations[0] ?? null;

  // Use project from URL param, or fall back to the conversation's project
  const activeProjectId = pid ?? activeConversation?.project_id ?? undefined;

  let initialMessages: Array<{ id: string; role: "user" | "assistant"; content: string }> = [];
  if (activeConversation) {
    try {
      const res = await apiClient<{ data: Array<{ id: string; role: string; content: string }> }>(
        `/api/v1/workspaces/${workspaceSlug}/conversations/${activeConversation.id}/messages`,
        { token: token ?? undefined }
      );
      initialMessages = res.data
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
    } catch {
      // no messages yet
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0C0C0E]" style={{ height: "calc(100vh - 49px)" }}>
      <div className="border-b border-[#27272B] bg-[#0C0C0E] px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-sm font-semibold text-[#EDEDEF]">
          {activeConversation ? activeConversation.title : "Planning Mode"}
        </h1>
        <div className="flex items-center gap-2">
          {activeConversation && (
            <ProjectSelector
              workspaceSlug={workspaceSlug}
              projects={projects}
              activeProjectId={activeProjectId}
              conversationId={activeConversation.id}
            />
          )}
          <NewConversationButton
            workspaceSlug={workspaceSlug}
            conversations={conversations}
            projects={projects}
            activeProjectId={activeProjectId}
          />
        </div>
      </div>

      {activeConversation ? (
        <div className="flex-1 min-h-0">
          <PlanningChat
            workspaceSlug={workspaceSlug}
            conversationId={String(activeConversation.id)}
            projectId={activeProjectId}
            initialMessages={initialMessages}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0C0C0E]">
          <div className="w-12 h-12 rounded-2xl bg-[#7C6FFD]/10 border border-[#7C6FFD]/20 flex items-center justify-center mb-4">
            <span className="text-[#7C6FFD] text-xl leading-none">✦</span>
          </div>
          <h2 className="text-base font-semibold text-[#EDEDEF] mb-1.5">Planning Mode</h2>
          <p className="text-sm text-[#88889A] max-w-xs leading-relaxed mb-6">
            Have a conversation with Claude to define your next feature. It will ask clarifying
            questions, then generate a spec and tickets automatically.
          </p>
          <NewConversationButton
            workspaceSlug={workspaceSlug}
            conversations={[]}
            projects={projects}
            primary
          />
        </div>
      )}
    </div>
  );
}
