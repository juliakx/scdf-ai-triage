import type { ChatMessage } from "./types";
import { MODEL_CANDIDATES, MAX_HISTORY_MESSAGES, MAX_PER_MESSAGE_CHARS, RETRY_HISTORY_BUDGETS } from "./types";

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

export function stripClinicAppendix(content: string): string {
  return content.replace(/\n{2,}Nearby clinics in[\s\S]*$/i, "").trim();
}

export function extractAssistantText(modelResponse: any): string {
  const msg = modelResponse?.choices?.[0]?.message;
  if (typeof msg?.content === "string") {
    const direct = msg.content.trim();
    if (direct) return direct;
  }

  const blocks = Array.isArray(msg?.content) ? msg.content : [];
  if (blocks.length > 0) {
    const textFromBlocks = blocks
      .map((b: any) => {
        if (typeof b === "string") return b.trim();
        return (
          asString(b?.text).trim() ||
          asString(b?.content).trim() ||
          asString(b?.output_text).trim()
        );
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    if (textFromBlocks) return textFromBlocks;
  }

  return (
    asString(modelResponse?.response).trim() ||
    asString(modelResponse?.result).trim() ||
    asString(modelResponse?.output_text).trim() ||
    ""
  );
}

export function sanitizeHistory(h: any): ChatMessage[] {
  if (!Array.isArray(h)) return [];
  const cleaned: ChatMessage[] = [];
  for (const m of h) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = asString(m?.content).trim();
    if (!role || !content) continue;
    cleaned.push({ role, content });
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES);
}

export function buildModelHistory(history: ChatMessage[], maxChars: number): ChatMessage[] {
  const out: ChatMessage[] = [];
  let used = 0;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i];
    const cleanedContent = msg.role === "assistant" ? stripClinicAppendix(msg.content) : msg.content;
    const trimmed = truncateText(cleanedContent, MAX_PER_MESSAGE_CHARS).trim();
    if (!trimmed) continue;

    const cost = trimmed.length + 20;
    if (out.length > 0 && used + cost > maxChars) break;

    out.unshift({ role: msg.role, content: trimmed });
    used += cost;
  }

  return out;
}

export function ensureCurrentUserMessage(history: ChatMessage[], query: string): ChatMessage[] {
  const q = query.trim();
  if (!q) return history;
  const last = history[history.length - 1];
  if (last?.role === "user" && last.content.trim() === q) return history;
  return [...history, { role: "user", content: q }];
}

export async function runModelWithRetries(ai: Ai, systemPrompt: string, history: ChatMessage[]): Promise<any> {
  let lastError: unknown;
  for (const modelName of MODEL_CANDIDATES) {
    for (const budget of RETRY_HISTORY_BUDGETS) {
      const modelHistory = buildModelHistory(history, budget);
      try {
        return await ai.run(modelName, {
          messages: [{ role: "system", content: systemPrompt }, ...modelHistory],
          max_tokens: 512,
        });
      } catch (e) {
        lastError = e;
      }
    }
  }
  throw lastError;
}
