const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export async function streamPlanMessage({
  workspaceSlug,
  conversationId,
  message,
  projectId,
  token,
  onChunk,
  onDone,
  onError,
}: {
  workspaceSlug: string;
  conversationId: string;
  message: string;
  projectId?: string;
  token: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
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
        ...(projectId && { project_id: projectId }),
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
        else if (chunk?.error) onError(chunk.error);
      } catch {
        // ignore parse errors
      }
    }
  }
}
