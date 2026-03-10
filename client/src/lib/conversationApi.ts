import { authHeaders } from "@/lib/api";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamConversationParams = {
  message: string;
  sourceLanguage: string;
  targetLanguage: string;
  proficiency: "beginner" | "intermediate" | "advanced";
  history?: ConversationMessage[];
};

export type StreamCallbacks = {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

/**
 * Stream a conversation turn from the AI. Calls onChunk for each text chunk,
 * onDone when complete, onError on failure.
 */
export async function streamConversation(
  params: StreamConversationParams,
  callbacks: StreamCallbacks
): Promise<string> {
  const auth = await authHeaders();
  const res = await fetch("/api/conversation", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...auth,
    },
    body: JSON.stringify({
      message: params.message,
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      proficiency: params.proficiency,
      history: params.history ?? [],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body?.message as string) || `Request failed (${res.status})`;
    callbacks.onError(msg);
    throw new Error(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === "chunk" && typeof payload.text === "string") {
              fullText += payload.text;
              callbacks.onChunk(payload.text);
            } else if (payload.type === "done") {
              callbacks.onDone();
            } else if (payload.type === "error") {
              callbacks.onError(payload.message ?? "Stream error");
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

export async function getConversationStatus(): Promise<{ configured: boolean }> {
  const res = await fetch("/api/conversation/status", { credentials: "include" });
  if (!res.ok) return { configured: false };
  const data = await res.json();
  return { configured: Boolean(data?.configured) };
}
