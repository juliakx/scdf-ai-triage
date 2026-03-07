export interface Env {
  AI: any;
  DB: D1Database;
}

export type TriageRuleRow = {
  topic: string;
  destination: string;
  trigger_any: string;
  immediate_actions: string;
  do_not: string;
};

export type PacCategoryRow = {
  category: string;
  title: string;
  description: string;
  examples: string;
};

export type ClinicRecommendation = {
  name: string;
  address: string;
  telephone: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const MODEL_CANDIDATES = [
  "@cf/openai/gpt-oss-120b",
  "@cf/meta/llama-3.1-8b-instruct-fast", // added new backups
  "@cf/mistralai/mistral-7b-instruct-v0.1", // added new backups
  // "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
] as const;

export const MAX_HISTORY_MESSAGES = 40;
export const MAX_PER_MESSAGE_CHARS = 600;
export const RETRY_HISTORY_BUDGETS = [2200, 1400, 900] as const;
