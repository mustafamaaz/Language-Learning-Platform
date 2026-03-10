import { buildConversationPrompt } from "../services/conversationPrompt.js";
import {
  streamChat,
  hasLlmConfigured,
} from "../services/llmService.js";

function normalize(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isValidProficiency(p) {
  return ["beginner", "intermediate", "advanced"].includes(p);
}

/**
 * POST /api/conversation
 * Body: { message, sourceLanguage, targetLanguage, proficiency, history? }
 * Streams SSE events: "chunk" with text, "done" when complete.
 */
export async function streamConversation(req, res) {
  const { message, sourceLanguage, targetLanguage, proficiency, history } =
    req.body ?? {};

  const msg = normalize(message);
  const src = normalize(sourceLanguage);
  const tgt = normalize(targetLanguage);
  const prof = normalize(proficiency).toLowerCase() || "beginner";

  if (!msg) {
    return res.status(400).json({ message: "message is required." });
  }
  if (!src || !tgt) {
    return res.status(400).json({
      message: "sourceLanguage and targetLanguage are required.",
    });
  }
  if (!isValidProficiency(prof)) {
    return res.status(400).json({
      message: "proficiency must be beginner, intermediate, or advanced.",
    });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            h &&
            typeof h === "object" &&
            (h.role === "user" || h.role === "assistant") &&
            typeof h.content === "string"
        )
        .map((h) => ({ role: h.role, content: String(h.content).trim() }))
        .filter((h) => h.content)
    : [];

  if (!hasLlmConfigured()) {
    return res.status(503).json({
      message: "LLM not configured. Set GEMINI_API_KEY or GROK_API_KEY in server/.env",
    });
  }

  const systemPrompt = buildConversationPrompt({
    sourceLanguage: src,
    targetLanguage: tgt,
    proficiency: prof,
    history: safeHistory,
  });

  const messages = [
    ...safeHistory,
    { role: "user", content: msg },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  try {
    for await (const chunk of streamChat(systemPrompt, messages)) {
      if (chunk) {
        res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
        res.flush?.();
      }
    }
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    console.error("Conversation stream error:", err);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: err.message || "Stream failed.",
      })}\n\n`
    );
  } finally {
    res.end();
  }
}

/**
 * GET /api/conversation/status
 * Returns whether LLM is configured (no key value exposed).
 */
export async function getConversationStatus(_req, res) {
  res.json({ configured: hasLlmConfigured() });
}
