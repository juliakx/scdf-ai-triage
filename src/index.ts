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
  <title>SCDF Triage Assistant</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f3f6fb;
      --panel: #ffffff;
      --panel-soft: #f8fafc;
      --border: #dbe3ee;
      --text: #1f2937;
      --muted: #6b7280;
      --primary: #c62828;
      --primary-soft: #eef3f9;
      --user: #d32f2f;
    }

    * { box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at top, #ffffff 0%, var(--bg) 55%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      color: var(--text);
    }

    .chat-container {
      width: min(100%, 760px);
      height: min(92vh, 900px);
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 45px rgba(15, 23, 42, 0.08);
    }

    .header {
      background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
      color: var(--text);
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .header-title {
      font-size: 1.02rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    .header-subtitle {
      font-size: 0.82rem;
      color: var(--muted);
      margin-top: 2px;
    }

    .header-badge {
      font-size: 0.72rem;
      color: #7f1d1d;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 999px;
      padding: 4px 8px;
      white-space: nowrap;
    }

    .settings {
      padding: 12px 20px;
      background: var(--panel-soft);
      border-bottom: 1px solid var(--border);
      font-size: 0.82rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .setting-label {
      font-size: 0.75rem;
      color: var(--muted);
      letter-spacing: 0.01em;
    }

    select, input.nric {
      padding: 9px 10px;
      border-radius: 10px;
      border: 1px solid #cfd8e3;
      background: #fff;
      color: var(--text);
      outline: none;
      font-size: 0.9rem;
    }

    select:focus, input.nric:focus, #userInput:focus {
      border-color: #9db6d8;
      box-shadow: 0 0 0 3px rgba(157, 182, 216, 0.25);
    }

    .messages {
      flex: 1;
      padding: 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #fbfcff;
    }

    .message {
      max-width: 84%;
      padding: 11px 14px;
      border-radius: 14px;
      line-height: 1.45;
      font-size: 0.95rem;
      white-space: pre-wrap;
      border: 1px solid transparent;
    }

    .message.user {
      align-self: flex-end;
      background: var(--user);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .message.bot {
      align-self: flex-start;
      background: var(--primary-soft);
      color: var(--text);
      border-color: #dfe8f4;
      border-bottom-left-radius: 4px;
    }

    .message.actions {
      align-self: flex-start;
      background: transparent;
      padding: 0;
      border: none;
    }

    .input-area {
      border-top: 1px solid var(--border);
      padding: 14px 16px;
      display: flex;
      gap: 10px;
      background: var(--panel);
    }

    #userInput {
      flex: 1;
      padding: 12px 14px;
      border: 1px solid #cfd8e3;
      border-radius: 12px;
      outline: none;
      font-size: 0.96rem;
      background: #fff;
    }

    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 0 18px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.92rem;
      min-width: 78px;
    }

    button:disabled {
      background: #d1d5db;
      color: #6b7280;
      cursor: default;
    }

    .call995-btn {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #d5dde8;
      padding: 6px 11px;
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.78rem;
      line-height: 1;
      min-width: auto;
    }

    .call995-btn:hover {
      background: #f1f5f9;
      color: #475569;
    }

    @media (max-width: 680px) {
      body { padding: 0; }
      .chat-container {
        width: 100%;
        height: 100vh;
        border-radius: 0;
        border-left: none;
        border-right: none;
      }
      .settings { grid-template-columns: 1fr; }
      .message { max-width: 90%; }
    }
  </style>
</head>
<body>

<div class="chat-container">
  <div class="header">
    <div>
      <div class="header-title">SCDF Triage Assistant</div>
      <div class="header-subtitle">Guidance for urgent and non-urgent symptoms</div>
    </div>
    <div class="header-badge">24/7 Guidance</div>
  </div>
  
  <div class="settings">
    <div class="setting-group">
      <label class="setting-label" for="language">Language</label>
      <select id="language">
        <option value="English">English</option>
        <option value="Chinese">Chinese (中文)</option>
        <option value="Malay">Malay (Bahasa)</option>
        <option value="Tamil">Tamil (தமிழ்)</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label" for="nric">Patient NRIC (optional)</label>
      <input type="text" id="nric" class="nric" placeholder="S1234567A">
    </div>
  </div>

  <div class="messages" id="messages">
    <div class="message bot">Hello, I’m here to help with triage guidance. Describe your symptoms, and include severity or duration if possible.</div>
  </div>

  <div class="input-area">
    <input type="text" id="userInput" placeholder="Describe symptoms (e.g. chest pain for 20 minutes)" onkeypress="handleEnter(event)">
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

  function addCall995Button() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message actions';

    const button = document.createElement('button');
    button.className = 'call995-btn';
    button.type = 'button';
    button.innerText = 'Call 995';
    button.onclick = () => {
      window.location.href = 'tel:87122139';
    };

    wrapper.appendChild(button);
    messagesDiv.appendChild(wrapper);
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
        if (data.shouldCall995 === true) {
          addCall995Button();
        }
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

        const normalizedAdvice = advice.toLowerCase();
        const shouldCall995 =
          normalizedAdvice.includes("a&e") ||
          normalizedAdvice.includes("a & e") ||
          normalizedAdvice.includes("a and e");

        return new Response(JSON.stringify({ response: text, shouldCall995 }), {
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