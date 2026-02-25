import { Ai } from "@cloudflare/ai";

export interface Env {
  AI: any;
  DB: D1Database;
}

// --- FRONTEND (HTML) ---
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCDF AI Triage Agent</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f4f4f9; display: flex; justify-content: center; height: 100vh; margin: 0; }
    .chat-container { width: 100%; max-width: 600px; background: white; display: flex; flex-direction: column; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .header { background: #d32f2f; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 1.2rem; }
    .messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    .message { max-width: 80%; padding: 10px 15px; border-radius: 15px; line-height: 1.4; font-size: 0.95rem; white-space: pre-wrap; }
    .message.user { align-self: flex-end; background: #007bff; color: white; border-bottom-right-radius: 2px; }
    .message.bot { align-self: flex-start; background: #e9ecef; color: black; border-bottom-left-radius: 2px; }
    .input-area { border-top: 1px solid #ddd; padding: 20px; display: flex; gap: 10px; background: #fff; }
    input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 25px; outline: none; font-size: 1rem; }
    button { background: #d32f2f; color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; }
    button:disabled { background: #ccc; }
    .settings { padding: 10px; background: #eee; font-size: 0.8rem; display: flex; gap: 10px; justify-content: center; }
    select, input.nric { padding: 5px; border-radius: 5px; border: 1px solid #ccc; }
  </style>
</head>
<body>

<div class="chat-container">
  <div class="header">🚑 SCDF AI Triage Agent</div>
  
  <div class="settings">
    <select id="language">
      <option value="English">English</option>
      <option value="Chinese">Chinese (中文)</option>
      <option value="Malay">Malay (Bahasa)</option>
      <option value="Tamil">Tamil (தமிழ்)</option>
    </select>
    <input type="text" id="nric" class="nric" placeholder="NRIC (Optional)">
  </div>

  <div class="messages" id="messages">
    <div class="message bot">Hello! I am your triage assistant. Describe your symptoms or enter a Patient NRIC above.</div>
  </div>

  <div class="input-area">
    <input type="text" id="userInput" placeholder="Type your symptoms here..." onkeypress="handleEnter(event)">
    <button id="sendBtn" onclick="sendMessage()">Send</button>
  </div>
</div>

<script>
  const messagesDiv = document.getElementById('messages');
  const input = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');

  // ✅ chat history
  let history = []; // [{role:"user"|"assistant", content:"..."}]

  function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

  // ✅ remove markdown ** so it doesn't show in UI
  function sanitizeForDisplay(text) {
    return String(text || "")
      .replace(/\\*\\*/g, "")
      .replace(/^\\s*\\*\\s+/gm, "• ");
  }

  function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = 'message ' + sender;
    div.innerText = sanitizeForDisplay(text);
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    history.push({ role: "user", content: text }); // ✅ add to history

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerText = '...';

    const nric = document.getElementById('nric').value;
    const language = document.getElementById('language').value;

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, nric, language, history })
      });
      
      const data = await response.json();
      if (data.error) {
        addMessage("Error: " + data.error, 'bot');
      } else {
        addMessage(data.response, 'bot');
        history.push({ role: "assistant", content: data.response }); // ✅ add assistant reply
      }
    } catch (e) {
      addMessage("Connection error. Please try again.", 'bot');
      console.error(e);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerText = 'Send';
    input.focus();
  }
</script>
</body>
</html>
`;

type TriageRuleRow = {
  topic: string;
  destination: string;
  trigger_any: string;
  immediate_actions: string;
  do_not: string;
};

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function sanitizeHistory(h: any): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(h)) return [];
  const cleaned: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of h) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = asString(m?.content).trim();
    if (!role || !content) continue;
    cleaned.push({ role, content });
  }
  return cleaned.slice(-10);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    if (request.method === "POST") {
      try {
        const ai = new Ai(env.AI);

        // ✅ safer JSON parse
        const body = (await request.json().catch(() => ({}))) as {
          query?: string;
          nric?: string;
          language?: string;
          history?: any;
        };

        const query = asString(body.query).trim();
        const nric = asString(body.nric).trim();
        const language = asString(body.language || "English").trim() || "English";
        const history = sanitizeHistory(body.history);

        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 1) PATIENT LOOKUP (D1)
        let patientContext = "No patient record found.";
        if (nric) {
          const patient = await env.DB
            .prepare("SELECT * FROM patients WHERE nric = ?")
            .bind(nric)
            .first<any>();

          if (patient) {
            patientContext =
              `Patient: ${asString(patient.name, "Unknown")}, Age: ${asString(patient.age, "Unknown")}, Sex: ${asString(patient.sex, "Unknown")}, ` +
              `Conditions: ${asString(patient.conditions, "None")}, Medications: ${asString(patient.medications, "None")}, Allergies: ${asString(patient.allergies, "None")}`;
          }
        }

        // 2) TRANSLATION -> English (only if needed)
        let englishQuery = query;
        if (language !== "English") {
          const translateResponse: any = await ai.run("@cf/aisingapore/gemma-sea-lion-v4-27b-it", {
            messages: [
              { role: "system", content: "You are a translator. Translate this medical text to English. Output ONLY the translation." },
              { role: "user", content: query },
            ],
            max_tokens: 256,
          });

          englishQuery =
            asString(translateResponse?.choices?.[0]?.message?.content) ||
            asString(translateResponse?.response) ||
            asString(translateResponse?.result) ||
            query;
        }

        // 3) RULE MATCHING
        const { results } = await env.DB.prepare(
          "SELECT topic, destination, trigger_any, immediate_actions, do_not FROM triage_rules"
        ).all<TriageRuleRow>();

        let matchedProtocol = "General Assessment";
        let urgency = "Standard";
        let advice = "Assess symptoms carefully.";
        let warnings = "";

        const queryLower = englishQuery.toLowerCase();

        for (const rule of results || []) {
          const triggers = asString((rule as any).trigger_any)
            .split(";")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);

          if (triggers.some((t) => queryLower.includes(t))) {
            matchedProtocol = asString((rule as any).topic, matchedProtocol);
            urgency = asString((rule as any).destination, urgency);
            advice = asString((rule as any).immediate_actions, advice);
            warnings = asString((rule as any).do_not, warnings);
            break;
          }
        }

        // 4) MODEL
        const systemPrompt = `
You are an official SCDF Triage Assistant.

CRITICAL PROTOCOL FOUND:
- Condition: ${matchedProtocol}
- Urgency Code: ${urgency} (AE = Emergency, GP = Doctor, SELF_CARE = Home)
- REQUIRED ACTIONS: ${advice}
- PROHIBITED ACTIONS: ${warnings}

PATIENT CONTEXT:
${patientContext}

CLARIFYING QUESTIONS RULE (IMPORTANT):
- You may ask at most ONE clarifying question total in the whole conversation.
- If the user answers vaguely (e.g., "no", "just flu"), do NOT ask again.
- Instead, give best-effort triage advice using available info + a short list of red flags that require urgent care.

INSTRUCTIONS:
1. Reply in ${language}.
2. If Urgency is 'AE', tell them to call 995 or go to A&E immediately.
3. Be calm, concise, and professional.
4. No fixed template/headings.
5. Do not use gratitude/apology phrases unless user explicitly asks.
`.trim();

        const modelResponse: any = await ai.run("@cf/openai/gpt-oss-120b", {
          messages: [{ role: "system", content: systemPrompt }, ...history],
          max_tokens: 1024,
        });

        console.log('MODEL RAW:', JSON.stringify(modelResponse, null, 2));

        const text =
          asString(modelResponse?.choices?.[0]?.message?.content) ||
          asString(modelResponse?.response) ||
          asString(modelResponse?.result) ||
          "";

        return new Response(JSON.stringify({ response: text }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e: any) {
        console.error("POST / error:", e); // ✅ prints real error in terminal
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  },
};