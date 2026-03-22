import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PlanningChat } from "@/components/planning-chat";
import { NewConversationButton } from "./new-conversation-button";
import { apiClient } from "@/lib/api";

interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  created_at: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ cid?: string }>;
}

export default async function PlanPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { cid } = await searchParams;

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
    // no conversations yet — API not running or no data
  }

  const activeConversation =
    conversations.find((c) => c.id === cid) ?? conversations[0] ?? null;

  // Load messages for active conversation
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
    <div className="h-full flex flex-col" style={{ height: "calc(100vh - 49px)" }}>
      {/* Top bar */}
      <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-sm font-semibold">
          {activeConversation ? activeConversation.title : "Planning Mode"}
        </h1>
        <NewConversationButton workspaceSlug={workspaceSlug} conversations={conversations} />
      </div>

      {/* Chat or empty state */}
      {activeConversation ? (
        <div className="flex-1 min-h-0">
          <PlanningChat
            workspaceSlug={workspaceSlug}
            conversationId={String(activeConversation.id)}
            initialMessages={initialMessages}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-3xl mb-3">✦</div>
          <h2 className="text-xl font-semibold mb-2">Planning Mode</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Have a conversation with Claude to define your next feature. It will ask clarifying
            questions, then generate a spec and tickets automatically.
          </p>
          <NewConversationButton workspaceSlug={workspaceSlug} conversations={[]} primary />
        </div>
      )}
    </div>
  );
}
