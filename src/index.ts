import { Ai } from '@cloudflare/ai';

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
    .message { max-width: 80%; padding: 10px 15px; border-radius: 15px; line-height: 1.4; font-size: 0.95rem; }
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

  function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

  function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = 'message ' + sender;
    div.innerText = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
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
        body: JSON.stringify({ query: text, nric, language })
      });
      
      const data = await response.json();
      if (data.error) {
        addMessage("Error: " + data.error, 'bot');
      } else {
        addMessage(data.response, 'bot');
      }
    } catch (e) {
      addMessage("Connection error. Please try again.", 'bot');
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- SERVE THE WEBSITE (GET) ---
    if (request.method === "GET") {
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // --- HANDLE THE API (POST) ---
    if (request.method === "POST") {
      try {
        const ai = new Ai(env.AI);
        const body = await request.json();
        const { query, nric, language } = body;

        // 1. PATIENT LOOKUP (D1)
        let patientContext = "No patient record found.";
        if (nric) {
          const patient = await env.DB.prepare("SELECT * FROM patients WHERE nric = ?").bind(nric).first();
          if (patient) {
            patientContext = `Patient: ${patient.name}, Age: ${patient.age}, Sex: ${patient.sex}, ` +
                             `Conditions: ${patient.conditions}, Medications: ${patient.medications}, Allergies: ${patient.allergies}`;
          }
        }

        // 2. TRANSLATION (SEA-LION)
        let englishQuery = query;
        if (language !== "English") {
          const translateResponse = await ai.run('@cf/aisingapore/gemma-sea-lion-v4-27b-it', {
            messages: [
              { role: "system", content: "You are a translator. Translate this medical text to English. Output ONLY the translation." },
              { role: "user", content: query }
            ]
          });
          englishQuery = translateResponse.response || query;
        }

        // 3. RULE MATCHING (SCDF Database)
        // We fetch the advice columns now!
        const { results } = await env.DB.prepare(
          "SELECT topic, destination, trigger_any, immediate_actions, do_not FROM triage_rules"
        ).all();

        let matchedProtocol = "General Assessment";
        let urgency = "Standard";
        let advice = "Assess symptoms carefully.";
        let warnings = "";

        const queryLower = englishQuery.toLowerCase();
        
        // Find the best matching rule
        for (const rule of results) {
          const triggers = (rule.trigger_any as string).split(';').map(t => t.trim().toLowerCase());
          if (triggers.some(t => t && queryLower.includes(t))) {
            matchedProtocol = rule.topic as string;
            urgency = rule.destination as string;
            advice = rule.immediate_actions as string;
            warnings = rule.do_not as string;
            break; 
          }
        }

        // 4. TRIAGE LOGIC (Llama 3 with SCDF Context)
        const systemPrompt = `
        You are an official SCDF Triage Assistant. 
        
        CRITICAL PROTOCOL FOUND:
        - Condition: ${matchedProtocol}
        - Urgency Code: ${urgency} (AE = Emergency, GP = Doctor, SELF_CARE = Home)
        - REQUIRED ACTIONS: ${advice}
        - PROHIBITED ACTIONS: ${warnings}

        PATIENT CONTEXT:
        ${patientContext}

        USER INPUT (Translated):
        "${englishQuery}"

        INSTRUCTIONS:
        1. Reply in ${language}.
        2. STRICTLY follow the "REQUIRED ACTIONS" above.
        3. If Urgency is 'AE', tell them to call 995 or go to A&E immediately.
        4. Mention the "PROHIBITED ACTIONS" if relevant (e.g., "Do not give food").
        5. Be calm, concise, and professional!
        `;

        const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query }
          ],
          max_tokens: 1024
        });

        return new Response(JSON.stringify({ 
          response: response.response 
        }), { headers: { "Content-Type": "application/json" } });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  }
};