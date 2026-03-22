const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiClient<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(error?.error?.message || "Request failed");
  }
  return res.json();
}

export interface SpecCreatedEvent {
  type: "spec_created";
  spec_id: string;
  spec_title: string;
  project_id: string;
  ticket_count: number;
}

export interface MisalignedTicketEvent {
  type: "misaligned_ticket";
  id: string;
  title: string;
  reason: string;
}

export interface ProposedTicketEvent {
  type?: "proposed_ticket";
  title: string;
  description?: string;
  priority: string;
  story_points?: number;
  project_id?: string;
}

export async function streamDistillation({
  workspaceSlug,
  northStar,
  token,
  onPhase,
  onChunk,
  onPlanDone,
  onMisalignedTicket,
  onProposedTicket,
  onDistillationCreated,
  onDone,
  onError,
}: {
  workspaceSlug: string;
  northStar: string;
  token: string;
  onPhase?: (label: string) => void;
  onChunk?: (chunk: string) => void;
  onPlanDone?: () => void;
  onMisalignedTicket?: (t: MisalignedTicketEvent) => void;
  onProposedTicket?: (t: ProposedTicketEvent) => void;
  onDistillationCreated?: (id: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}) {
  const res = await fetch(
    `${API_BASE}/api/v1/workspaces/${workspaceSlug}/ai/distill`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ distillation: { north_star: northStar } }),
    }
  );

  if (!res.ok || !res.body) {
    onError?.("Failed to connect to AI");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onDone?.();
        return;
      }
      try {
        const event = JSON.parse(data);
        if (event?.error) { onError?.(event.error); return; }
        if (event?.type === "phase") onPhase?.(event.label);
        else if (event?.type === "chunk") onChunk?.(event.content);
        else if (event?.type === "plan_done") onPlanDone?.();
        else if (event?.type === "misaligned_ticket") onMisalignedTicket?.(event as MisalignedTicketEvent);
        else if (event?.type === "proposed_ticket") onProposedTicket?.(event as ProposedTicketEvent);
        else if (event?.type === "distillation_created") onDistillationCreated?.(String(event.id));
      } catch {
        // ignore parse errors
      }
    }
  }
}

export async function streamPlanMessage({
  workspaceSlug,
  conversationId,
  message,
  projectId,
  token,
  onChunk,
  onDone,
  onError,
  onSpecCreated,
}: {
  workspaceSlug: string;
  conversationId: string;
  message: string;
  projectId?: string;
  token: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onSpecCreated?: (event: SpecCreatedEvent) => void;
}) {
  const res = await fetch(
    `${API_BASE}/api/v1/workspaces/${workspaceSlug}/ai/plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan: { message, conversation_id: conversationId },
        project_id: projectId,
      }),
    }
  );

  if (!res.ok || !res.body) {
    onError("Failed to connect to AI");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onDone();
        return;
      }
      try {
        const chunk = JSON.parse(data);
        if (typeof chunk === "string") onChunk(chunk);
        else if (chunk?.type === "spec_created") onSpecCreated?.(chunk as SpecCreatedEvent);
        else if (chunk?.error) onError(chunk.error);
      } catch {
        // ignore parse errors
      }
    }
  }
}
