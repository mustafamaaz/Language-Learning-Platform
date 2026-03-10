import "../config/env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

/**
 * Auto-detects LLM provider from env vars.
 * GEMINI_API_KEY -> Google Generative AI
 * GROK_API_KEY -> xAI Grok (OpenAI-compatible)
 * Priority: Gemini first if both are set.
 *
 * Use gemini-2.5-flash-lite for best free tier limits (15 RPM, 1000 RPD).
 * Override with GEMINI_MODEL env var if needed.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const GROK_API_KEY = process.env.GROK_API_KEY?.trim();
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

// Fallback models when primary hits quota (each has separate free-tier quota)
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

let geminiClient = null;
let grokClient = null;

if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

if (GROK_API_KEY) {
  grokClient = new OpenAI({
    apiKey: GROK_API_KEY,
    baseURL: "https://api.x.ai/v1",
  });
}

const ACTIVE_PROVIDER = GEMINI_API_KEY ? "gemini" : GROK_API_KEY ? "grok" : null;

export function getActiveProvider() {
  return ACTIVE_PROVIDER;
}

export function hasLlmConfigured() {
  return ACTIVE_PROVIDER !== null;
}

function isQuotaError(err) {
  const msg = err?.message ?? String(err);
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded")
  );
}

/**
 * Stream chat response from the configured LLM.
 * Falls back to Grok if Gemini returns 429/quota error and GROK_API_KEY is set.
 */
export async function* streamChat(systemPrompt, messages) {
  if (!ACTIVE_PROVIDER) {
    throw new Error(
      "No LLM configured. Set GEMINI_API_KEY or GROK_API_KEY in server/.env"
    );
  }

  if (ACTIVE_PROVIDER === "gemini") {
    try {
      yield* streamGemini(systemPrompt, messages);
    } catch (err) {
      if (isQuotaError(err) && GROK_API_KEY && grokClient) {
        console.warn("Gemini quota exceeded, falling back to Grok:", err?.message);
        yield* streamGrok(systemPrompt, messages);
      } else {
        throw err;
      }
    }
  } else {
    yield* streamGrok(systemPrompt, messages);
  }
}

async function* streamGemini(systemPrompt, messages) {
  const modelsToTry = [
    GEMINI_MODEL,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL),
  ];
  let lastErr = null;

  for (const modelId of modelsToTry) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: modelId,
        systemInstruction: systemPrompt,
      });

      const contents = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      // console.log("\n--- Gemini API Request ---");
      // console.log("Model:", modelId);
      // console.log("System prompt:\n", systemPrompt);
      // console.log("Messages (contents):\n", JSON.stringify(contents, null, 2));
      // console.log("--- End ---\n");

      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        try {
          const text = chunk.text?.() ?? chunk.text ?? "";
          if (text) yield text;
        } catch {
          /* blocked or empty chunk */
        }
      }
      return;
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) {
        console.warn(`Gemini ${modelId} quota exceeded, trying next model...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

async function* streamGrok(systemPrompt, messages) {
  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  console.log("\n--- Grok API Request ---");
  console.log("Model: grok-3");
  console.log("Full prompt (system + messages):\n", JSON.stringify(openaiMessages, null, 2));
  console.log("--- End ---\n");

  const stream = await grokClient.chat.completions.create({
    model: "grok-3",
    messages: openaiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) yield content;
  }
}
