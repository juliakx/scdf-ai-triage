import type { ChatMessage } from "./types";
import { MODEL_CANDIDATES, MAX_HISTORY_MESSAGES, MAX_PER_MESSAGE_CHARS, RETRY_HISTORY_BUDGETS } from "./types";

// export makes it public so functions can be accessible outside utils.ts
// async means the function performs a task that doesnt finish instantly (like waiting for an ai response)
// this is so that the app can still continue functioning as the function gets carried out in the background

// this function is needed since our data comes in from q a few places, e.g. if DB returns a number (patient's age), and UI expects a strinf, the app might stop working
// if the data is null, rather than giving a tech error, it just shows a blank space
export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

// replace(/[^a-z0-9\s]/g, " ") anything thats not a lowercase letter/number/space, it'll be replaced by a " ". so it strips out punctuationsetc
// prevents punctu
// replace(/\s+/g, " ") any multiple spaces in a row is removed and collapses into a single space (useful as the output of previous replace may result in multiple spaces in between)
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`; // subtract 3 from maxChars to amke room for the "..." at the end
}

// Removes the automatically appended clinic recommendation list from an assistant's message -> clean the history and save tokens
export function stripClinicAppendix(content: string): string {
  return content.replace(/\n{2,}Nearby clinics in[\s\S]*$/i, "").trim();
}

// handles diff AI output format, and ensure the system extracts the correct text
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

// Cleans and validates the raw chat history received from the frontend. ensures only valid 'user' and 'assistant' roles are kept
export function sanitizeHistory(h: any): ChatMessage[] {
  if (!Array.isArray(h)) return [];
  const cleaned: ChatMessage[] = [];
  for (const m of h) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = asString(m?.content).trim();
    if (!role || !content) continue;
    cleaned.push({ role, content });
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES); // Return only the most recent messages, up to the max limit
}

export function buildModelHistory(history: ChatMessage[], maxChars: number): ChatMessage[] {
  const out: ChatMessage[] = [];
  let used = 0;

  for (let i = history.length - 1; i >= 0; i -= 1) { // start with most recent msg
    const msg = history[i];
    const cleanedContent = msg.role === "assistant" ? stripClinicAppendix(msg.content) : msg.content; // if its msg by AI, remove the clinic list to save tokens
    const trimmed = truncateText(cleanedContent, MAX_PER_MESSAGE_CHARS).trim();
    if (!trimmed) continue;

    const cost = trimmed.length + 20; // agar agar cost of msg
    if (out.length > 0 && used + cost > maxChars) break; // if adding this msg exceed total udget, stop adding older msg

    out.unshift({ role: msg.role, content: trimmed }); // else, add msg to start of output array
    used += cost;
  }

  return out;
}

// Ensures that the current user query is the very last message in the history. Prevents AI from responding to odler msg instead
export function ensureCurrentUserMessage(history: ChatMessage[], query: string): ChatMessage[] {
  const q = query.trim();
  if (!q) return history;
  const last = history[history.length - 1];
  if (last?.role === "user" && last.content.trim() === q) return history; // if last msg in history is alrdy the current user query, then do nothing
  return [...history, { role: "user", content: q }]; // else append to history
}

// to prevent entre chat from failing after several prompts, would retry with other models if it fails.
export async function runModelWithRetries(ai: Ai, systemPrompt: string, history: ChatMessage[]): Promise<any> {
  let lastError: unknown;

  // go through the list of models
  for (const modelName of MODEL_CANDIDATES) {
    for (const budget of RETRY_HISTORY_BUDGETS) {

      // trim chat history to fit current character budget if chat gets too long, use recent messages only
      const modelHistory = buildModelHistory(history, budget);
      try { // try to rereun with the selected model and trimmed history
        return await ai.run(modelName, {
          messages: [{ role: "system", content: systemPrompt }, ...modelHistory],
          max_tokens: 512, // limits length of ai response
        });
      } catch (e) { // saves the error if there is, to keep track in case everything fail, it will throw final error 
        lastError = e; 
      }
    }
  }
  throw lastError;
}
