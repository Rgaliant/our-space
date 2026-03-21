import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PlanningChat } from "@/components/planning-chat";
import { apiClient } from "@/lib/api";

interface Conversation {
  id: string;
  title: string;
  project_id: string | null;
  created_at: string;
}

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ conversation_id?: string }>;
}

export default async function PlanPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { conversation_id } = await searchParams;

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

  const activeConversation =
    conversations.find((c) => c.id === conversation_id) ??
    conversations[0];

  if (!activeConversation) {
    // No conversation — show create prompt
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-2">Planning Mode</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Start a new conversation to plan your next feature.
        </p>
        <CreateConversationButton workspaceSlug={workspaceSlug} />
      </div>
    );
  }

  // Load messages
  let initialMessages: Array<{ id: string; role: "user" | "assistant"; content: string }> = [];
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

  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold">{activeConversation.title}</h1>
      </div>
      <PlanningChat
        workspaceSlug={workspaceSlug}
        conversationId={String(activeConversation.id)}
        initialMessages={initialMessages}
      />
    </div>
  );
}

function CreateConversationButton({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    <form
      action={async () => {
        "use server";
        // This is a placeholder — actual creation handled client-side
      }}
    >
      <a
        href={`/workspace/${workspaceSlug}/plan/new`}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        Start Planning Session
      </a>
    </form>
  );
}
