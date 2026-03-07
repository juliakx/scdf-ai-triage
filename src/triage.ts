import type { ChatMessage, PacCategoryRow } from "./types";
import { asString, normalize } from "./utils";

export function buildKnownFactsList(history: ChatMessage[], query: string): string[] {
  // combine all user messages and the current query into a single array of strings
  const userTexts = [...history.filter((m) => m.role === "user").map((m) => m.content), query].map((t) => t.trim()).filter(Boolean);
  const facts = new Set<string>();

  // medical keywords to look for
  const keywordPattern = /\b(cut|laceration|bleed|bleeding|fever|pain|cough|vomit|vomiting|chills|rash|headache|breath|dizzy|diarrh|finger|hand|chest|abdomen|throat)\b/i;

  for (const text of userTexts) {
    const lower = text.toLowerCase();

    // Check for duration/timing
    if (/(?:\d+)\s*(?:min|mins|minute|minutes|hour|hours|day|days)\b/i.test(text)) {
      facts.add(`Timing: ${text}`);
    }

    // physical measurements
    if (/(?:\d+(?:\.\d+)?)\s*cm\b/i.test(text)) {
      facts.add(`Size: ${text}`);
    }

    // wound depth descriptions
    if (/\b(shallow|deep|not deep)\b/i.test(text)) {
      facts.add(`Depth: ${text}`);
    }

    // types of bleeding
    if (/\b(spurt|spurting|steady flow|ooze|oozing|bleeding)\b/i.test(lower)) {
      facts.add(`Bleeding: ${text}`);
    }

    // common medications
    if (/\b(paracetamol|ibuprofen|medication|medicine)\b/i.test(lower)) {
      facts.add(`Medication: ${text}`);
    }

    // Yes/No answers to follow-up questions
    if (/\b(yes|no)\b/i.test(lower) && history.length > 0) {
      facts.add(`Patient answer: ${text}`);
    }
    if (keywordPattern.test(text) && text.length <= 120) {
      facts.add(`Symptom detail: ${text}`);
    }

    // limit extraction to prevent data overload
    if (facts.size >= 10) break;
  }

  return [...facts].slice(0, 6);
}

// formats the list of facts into bulleted Markdown string for UI
export function buildKnownFacts(history: ChatMessage[], query: string): string {
  const lines = buildKnownFactsList(history, query);
  return lines.length ? lines.map((l) => `- ${l}`).join("\n") : "- No stable facts extracted yet.";
}

export function deriveWhyTriage(urgency: string, matchedProtocol: string, knownFacts: string[], patientRecord: any): string[] {
  const reasons: string[] = [];
  reasons.push(`Protocol matched: ${matchedProtocol}.`);
  reasons.push(`Urgency classified as: ${urgency}.`);

  // clean up the fact labels (e.g remove Timing:)
  for (const fact of knownFacts.slice(0, 2)) {
    reasons.push(fact.replace(/^(Timing|Size|Depth|Bleeding|Medication|Patient answer|Symptom detail):\s*/i, ""));
  }

  // Check if the user's existing medical history played a role
  const conditions = asString(patientRecord?.conditions).trim();
  if (conditions && conditions !== "None" && conditions !== "[]" && conditions !== '[""]') {
    reasons.push("Relevant medical history was considered from patient record.");
  }

  return reasons.slice(0, 4);
}

export function deriveMissingCriticalInfo(botIsStillAsking: boolean, responseText: string, knownFacts: string[]): string[] {
  if (botIsStillAsking) {
    const question = responseText.split("\n").find((line) => line.trim().endsWith("?")) || "One focused follow-up answer is still needed.";
    return [question.trim()];
  }

  // prompt for more detail if needed
  if (knownFacts.length < 2) {
    return ["Symptom details are still sparse; confirm duration, severity, and associated symptoms if they change."];
  }

  return ["No critical missing info for the current disposition."];
}

// splits a string into small strings based on punctuation (for keyword matching)
export function extractPacPhrases(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[,.;]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

export function derivePacCategory(
  englishQuery: string,
  pacRows: PacCategoryRow[]
): { category: string; title: string; description: string; examples: string; confidence: "low" | "medium" | "high" } | null {
  const q = normalize(englishQuery);
  if (!q || !pacRows.length) return null;

  let best: { row: PacCategoryRow; score: number } | null = null;

  for (const row of pacRows) {
    const phrases = extractPacPhrases(`${row.title}, ${row.examples}`);
    let score = 0;
    for (const phrase of phrases) {

      // high score for matching a full phrase
      if (q.includes(normalize(phrase))) score += 5;

      // lower score for matching individual words
      const tokens = phrase.split(" ").filter((t) => t.length >= 4);
      for (const token of tokens) {
        if (q.includes(token)) score += 1;
      }
    }
    if (!best || score > best.score) best = { row, score };
  }

  if (!best || best.score <= 0) return null;

  // how confident the system is based on the score
  const confidence: "low" | "medium" | "high" =
    best.score >= 12 ? "high" : best.score >= 6 ? "medium" : "low";

  return {
    category: asString(best.row.category),
    title: asString(best.row.title),
    description: asString(best.row.description),
    examples: asString(best.row.examples),
    confidence,
  };
}

// backup 
export function buildFallbackClinicalReply(query: string, history: ChatMessage[], urgency: string, advice: string, knownFactsList: string[] = []): string {
  const userTranscript = `${history.filter((m) => m.role === "user").map((m) => m.content).join(" ")} ${query}`.toLowerCase();
  const hasHighFever = /\b(?:39|40|41)(?:\s*\.?\s*\d+)?\s*(?:c|°c|degrees?)?\b/.test(userTranscript);
  const hasPersistentDays = /\b(?:[3-9]|[1-9]\d+)\s*day/.test(userTranscript);
  const hasChills = /\bchills?|rigors?|shaking\b/.test(userTranscript);

  // for high fever 39 & above
  if (hasHighFever && hasPersistentDays) {
    return "A persistent high fever for several days needs prompt in-person medical review today. Please go to a GP clinic or polyclinic as soon as possible. Keep hydrating, and if you develop red-flag symptoms (confusion, severe headache, rapid breathing, chest/abdominal pain, repeated vomiting, or trouble staying upright), call 995 or go to A&E immediately.";
  }

  // high fever for multiple days
  if (hasChills) {
    return "Fever with chills can indicate a significant infection and should be assessed by a doctor today. Please attend a nearby GP clinic or polyclinic promptly. If severe symptoms develop, call 995 or go to A&E immediately.";
  }

  if (isEmergencyUrgency(urgency) || advice.toLowerCase().includes("a&e")) {
    return "Your symptoms may require emergency care. Please call 995 or go to the nearest A&E now.";
  }

  const u = urgency.toLowerCase();

  if (u.includes("self_care") || u.includes("self care")) {
    return "This appears to be a mild condition that can be managed at home. Rest well, stay hydrated, and take over-the-counter pain relief or fever reducers if needed (e.g. paracetamol). If your symptoms worsen, persist beyond a week, or you develop fever, breathing difficulty, or other concerning signs, please see a GP or polyclinic.";
  }

  if (u.includes("gp") || u.includes("polyclinic")) {
    return "It would be advisable to see a GP or polyclinic for a proper assessment. While this does not appear to be an emergency, a doctor can review your symptoms and recommend appropriate treatment. If symptoms worsen significantly or you develop any danger signs, seek care promptly or call 995.";
  }

  return "Please see a GP or polyclinic for an assessment. If you worsen or develop danger signs, call 995 or go to A&E immediately.";
}

export function isLikelyNoReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "no" || t === "nope" || t === "none" || t === "nil" || t.startsWith("no ");
}

// checks if the AI has asked a "checklist" style question (multiple symptoms at once).
export function isBroadSymptomChecklist(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = ["cough", "breath", "chest pain", "rash", "headache", "vomit", "confusion", "chills", "abdominal pain"];
  const hits = keywords.filter((k) => t.includes(k)).length;
  return t.includes("?") && (t.includes("other symptoms") || hits >= 3);
}

export function hasRecentChecklistDenied(history: ChatMessage[]): boolean {
  for (let i = history.length - 1; i >= 1; i -= 1) {
    const userMsg = history[i];
    const assistantMsg = history[i - 1];
    if (userMsg.role !== "user" || assistantMsg.role !== "assistant") continue;
    if (isBroadSymptomChecklist(assistantMsg.content) && isLikelyNoReply(userMsg.content)) return true;
  }
  return false;
}

export function isLikelyNegativeAnswer(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "no" || t === "nope" || t === "none" || t === "nil" || t === "nah";
}

// counts how many times the user has said "No" in recent messages, to stop the AI from over-questioning if the user keeps saying they don't have symptoms
export function countRecentNegativeUserAnswers(history: ChatMessage[], limit = 6): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0 && count < limit; i -= 1) {
    const msg = history[i];
    if (msg.role !== "user") continue;
    if (isLikelyNegativeAnswer(msg.content)) count += 1;
    else break;
  }
  return count;
}

// checks a response to see if it contains an active command to go to emergency services.
export function hasImmediateEmergencyDirective(text: string): boolean {
  const t = text.toLowerCase();
  const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

  const emergencyPattern = /\b(?:call|dial)\s*995\b|\bgo\s+(?:directly\s+)?to\s+(?:the\s+)?a\s*&?\s*e\b|\bgo\s+to\s+(?:the\s+)?emergency\b|\bproceed\s+to\s+(?:the\s+)?a\s*&?\s*e\b/i;
  const emergencySentence = sentences.find(
    (s) => emergencyPattern.test(s)
  );
  if (!emergencySentence) return false;

  if (
    emergencySentence.startsWith("if ") ||
    emergencySentence.startsWith("when ") ||
    emergencySentence.includes("if you develop") ||
    emergencySentence.includes("if symptoms worsen") ||
    emergencySentence.includes("if you notice") ||
    emergencySentence.includes("if any of these")
  ) {
    return false;
  }
  return true;
}

// Helper to check if the urgency is non-critical (GP or Self Care)
export function isNonEmergencyUrgency(urgency: string, advice: string): boolean {
  const u = urgency.toLowerCase();
  const a = advice.toLowerCase();
  return (
    u.includes("gp") ||
    u.includes("polyclinic") ||
    u.includes("self_care") ||
    u.includes("self care") ||
    a.includes("gp clinic") ||
    a.includes("general practitioner") ||
    a.includes("polyclinic") ||
    a.includes("see a doctor") ||
    a.includes("visit a doctor")
  );
}

// Helper to check if the urgency is an emergency (A&E)
export function isEmergencyUrgency(urgency: string): boolean {
  const u = urgency.toLowerCase().trim();
  return u === "ae" || u.includes("emergency") || u.includes("a&e") || u.includes("a & e") || u.includes("a and e");
}

// checks if the user is asking for specific clinics
export function asksForClinicRecommendation(query: string): boolean {
  const q = query.toLowerCase();
  return [
    "gp", "clinic", "doctor", "which gp", "nearest", "closest",
    "recommend", "where can i go", "where should i go", "see a doctor",
  ].some((term) => q.includes(term));
}

// check if user is answering "Yes"
export function isAffirmativeReply(query: string): boolean {
  const q = query.trim().toLowerCase();
  return ["yes", "y", "ok", "okay", "sure", "please", "can", "can help", "yea", "yeah"].includes(q);
}

// checks if the AI recently offered to find a clinic
export function recentlyOfferedClinicSuggestion(history: ChatMessage[]): boolean {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m.role !== "assistant") continue;
    const t = m.content.toLowerCase();
    if (t.includes("would you like me to suggest nearby clinics") || t.includes("suggest nearby clinics")) return true;
    if (t.includes("nearby clinics in")) return false;
  }
  return false;
}

// checks if the system has already prompted the user for their location/area.
export function alreadyAskedForLocation(history: ChatMessage[]): boolean {
  return history.some(
    (m) =>
      m.role === "assistant" &&
      (m.content.toLowerCase().includes("which area") ||
        m.content.toLowerCase().includes("where do you stay") ||
        m.content.toLowerCase().includes("your location") ||
        m.content.toLowerCase().includes("your area") ||
        m.content.toLowerCase().includes("nearby clinic") ||
        m.content.toLowerCase().includes("closest gp"))
  );
}
