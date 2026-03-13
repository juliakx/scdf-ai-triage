import { Ai } from "@cloudflare/ai";

export interface Env {
  AI: any;
  DB: D1Database;
}

// dump the entire frontend ui into this string so we can serve it from the worker directly
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Triage Assistant</title>
  <style>
    :root {
      color-scheme: light;
      --hh-green: #1a6640;
      --hh-green-dark: #144f32;
      --hh-green-light: #e8f4ed;
      --bg: #f5f7f5;
      --panel: #ffffff;
      --border: #d4dbd4;
      --text: #1a2e1a;
      --muted: #5a6e5a;
      --user-bg: #1a6640;
      --user-fg: #ffffff;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      color: var(--text);
    }

    .site-header {
      background: var(--hh-green);
      color: #fff;
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .site-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
    }

    .logo-mark {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      background: rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 300;
      color: #fff;
      flex-shrink: 0;
      line-height: 1;
    }

    .logo-text {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    .page-body {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 28px 16px 24px;
    }

    .chat-container {
      width: min(100%, 820px);
      height: calc(100vh - 56px - 52px);
      min-height: 480px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    }

    .header {
      background: var(--panel);
      padding: 16px 20px 14px;
      border-bottom: 2px solid var(--hh-green);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      width: 36px;
      height: 36px;
      background: var(--hh-green-light);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon svg {
      width: 18px;
      height: 18px;
      stroke: var(--hh-green);
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .header-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
    }

    .header-subtitle {
      font-size: 0.78rem;
      color: var(--muted);
      margin-top: 2px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-badge {
      font-size: 0.72rem;
      color: var(--hh-green-dark);
      background: var(--hh-green-light);
      border: 1px solid #b2d4be;
      border-radius: 4px;
      padding: 3px 8px;
      white-space: nowrap;
      font-weight: 500;
    }

    .panel-toggle {
      background: #fff;
      color: var(--muted);
      border: 1px solid var(--border);
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 0.76rem;
      font-weight: 500;
      cursor: pointer;
      min-width: auto;
    }

    .panel-toggle:hover {
      border-color: var(--hh-green);
      color: var(--hh-green);
    }

    .settings {
      padding: 10px 20px;
      background: #f9fbf9;
      border-bottom: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .setting-label {
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    select, input.nric {
      padding: 7px 10px;
      border-radius: 4px;
      border: 1px solid #c8d5c8;
      background: #fff;
      color: var(--text);
      outline: none;
      font-size: 0.88rem;
    }

    select:focus, input.nric:focus, #userInput:focus {
      border-color: var(--hh-green);
      box-shadow: 0 0 0 2px rgba(26, 102, 64, 0.12);
    }

    .workspace {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 272px;
      min-height: 0;
    }

    .chat-pane {
      min-width: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-right: 1px solid var(--border);
    }

    .messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #fafcfa;
    }

    .message {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 4px;
      line-height: 1.5;
      font-size: 0.92rem;
      white-space: pre-wrap;
    }

    .message.user {
      align-self: flex-end;
      background: var(--user-bg);
      color: var(--user-fg);
      border-bottom-right-radius: 2px;
    }

    .message.bot {
      align-self: flex-start;
      background: #fff;
      color: var(--text);
      border: 1px solid var(--border);
      border-bottom-left-radius: 2px;
    }

    .message.actions {
      align-self: flex-start;
      background: transparent;
      padding: 0;
      border: none;
    }

    .input-area {
      border-top: 1px solid var(--border);
      padding: 12px 16px;
      display: flex;
      gap: 8px;
      background: var(--panel);
    }

    #userInput {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #c8d5c8;
      border-radius: 4px;
      outline: none;
      font-size: 0.92rem;
      background: #fff;
      color: var(--text);
    }

    button {
      background: var(--hh-green);
      color: white;
      border: none;
      padding: 0 18px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.88rem;
      min-width: 72px;
    }

    button:hover:not(:disabled) {
      background: var(--hh-green-dark);
    }

    button:disabled {
      background: #c8d5c8;
      color: var(--muted);
      cursor: default;
    }

    .message-action-bar {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(0,0,0,0.07);
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .call995-btn, .call118-btn {
      background: #fff;
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 0.88rem;
      cursor: pointer;
      min-width: auto;
    }

    .call995-btn:hover, .call118-btn:hover {
      border-color: var(--hh-green);
      color: var(--hh-green);
    }

    .insights-pane {
      background: #fff;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .tabs-bar {
      display: flex;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .tab-btn {
      flex: 1;
      background: #f9fbf9;
      color: var(--muted);
      border: none;
      border-bottom: 2px solid transparent;
      padding: 8px 4px;
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-radius: 0;
      min-width: auto;
    }

    .tab-btn:hover:not(:disabled) {
      background: #f0f5f0;
      color: var(--hh-green);
    }

    .tab-btn.active {
      background: #fff;
      color: var(--hh-green);
      border-bottom-color: var(--hh-green);
    }

    .insights-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      font-size: 0.82rem;
      color: #2e3d2e;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .insights-content.hidden { display: none; }

    .clinics-placeholder {
      color: var(--muted);
      font-size: 0.82rem;
      text-align: center;
      padding: 24px 12px;
      line-height: 1.5;
    }

    .insight-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 10px 12px;
    }

    .insight-title {
      font-size: 0.70rem;
      color: var(--muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .insight-line {
      margin: 0 0 5px;
      line-height: 1.4;
      color: var(--text);
    }

    .insight-line:last-child { margin-bottom: 0; }

    .guide-card { border-left: 3px solid #d4dbd4; }
    .guide-card.gc-red { border-left-color: #dc2626; }
    .guide-card.gc-orange { border-left-color: #ea580c; }
    .guide-card.gc-amber { border-left-color: #d97706; }
    .guide-card.gc-blue { border-left-color: #5ec7ff; }
    .guide-card.gc-green { border-left-color: #16a34a; }

    .guide-card .insight-title {
      text-transform: none;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: 0;
      margin-bottom: 8px;
    }

    .guide-card .insight-line {
      padding-left: 10px;
      border-left: 2px solid #e8f0e8;
      margin-bottom: 5px;
      color: var(--muted);
    }

    .workspace.panel-hidden {
      grid-template-columns: 1fr;
    }

    .workspace.panel-hidden .chat-pane {
      border-right: none;
    }

    .workspace.panel-hidden .insights-pane {
      display: none;
    }

    @media (max-width: 680px) {
      .page-body { padding: 0; }
      .chat-container {
        width: 100%;
        height: calc(100vh - 56px);
        border-radius: 0;
        border: none;
        box-shadow: none;
      }
      .settings { grid-template-columns: 1fr; }
      .message { max-width: 90%; }
      .workspace {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(0, 1fr) 200px;
      }
      .chat-pane { border-right: none; border-bottom: 1px solid var(--border); }
    }
  </style>
</head>
<body>

<header class="site-header">
  <div class="site-logo">
    <div class="logo-mark">+</div>
    <span class="logo-text">Triage Assistant</span>
  </div>
</header>

<div class="page-body">
<div class="chat-container">
  <div class="header">
    <div class="header-left">
      <div class="header-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div>
        <div class="header-title">Symptom Checker</div>
        <div class="header-subtitle">Guidance for urgent and non-urgent symptoms</div>
      </div>
    </div>
    <div class="header-right">
      <button type="button" class="panel-toggle" id="panelToggle" onclick="togglePanel()">Hide Panel</button>
      <div class="header-badge">24 / 7</div>
    </div>
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
      <label class="setting-label" for="nric">Patient NRIC</label>
      <input type="text" id="nric" class="nric" placeholder="S1234567A">
    </div>
  </div>

  <div class="workspace">
    <div class="chat-pane">
      <div class="messages" id="messages">
        <div class="message bot">Hello. Please describe your symptoms, including how long you've had them and how severe they feel.</div>
      </div>
      <div class="input-area">
        <input type="text" id="userInput" placeholder="e.g. chest pain for 20 minutes" onkeypress="handleEnter(event)">
        <button id="sendBtn" onclick="sendMessage()">Send</button>
      </div>
    </div>

    <aside class="insights-pane">
      <div class="tabs-bar">
        <button type="button" class="tab-btn active" id="tabGuide" onclick="switchTab('guide')">Guide</button>
        <button type="button" class="tab-btn" id="tabClinics" onclick="switchTab('clinics')">Nearby Clinics</button>
      </div>
      <div class="insights-content" id="insightsGuide"></div>
      <div class="insights-content hidden" id="insightsClinics"></div>
    </aside>
  </div>
</div>
</div>

<script>
  const messagesDiv = document.getElementById('messages');
  const input = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const panelToggle = document.getElementById('panelToggle');
  const workspace = document.querySelector('.workspace');
  const insightsGuide = document.getElementById('insightsGuide');
  const insightsClinics = document.getElementById('insightsClinics');
  let history = [];

  function switchTab(tab) {
    const isGuide = tab === 'guide';
    document.getElementById('tabGuide').classList.toggle('active', isGuide);
    document.getElementById('tabClinics').classList.toggle('active', !isGuide);
    insightsGuide.classList.toggle('hidden', !isGuide);
    insightsClinics.classList.toggle('hidden', isGuide);
  }

  // allow the user to just press enter instead of clicking the button
  function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

  // strips out some basic markdown formatting from the bot's response so it looks cleaner
  function sanitizeForDisplay(text) {
    return String(text || "")
      .replace(/\\*\\*/g, "")
      .replace(/^\\s*\\*\\s+/gm, "• ");
  }

  // helper to drop new chat bubbles onto the screen
  function addMessage(text, sender) {
    if (!String(text || "").trim()) return;
    const div = document.createElement('div');
    div.className = 'message ' + sender;
    div.innerText = sanitizeForDisplay(text);
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return div;
  }

  // injects the emergency contact buttons below the bot's message if needed
  function addCallButtons(msgDiv, show995, show118) {
    // always strip buttons from older messages — only the latest reply should show them
    document.querySelectorAll('.message-action-bar').forEach(function(el) { el.remove(); });
    if (!show995 && !show118) return;
    const bar = document.createElement('div');
    bar.className = 'message-action-bar';
    if (show995) {
      const btn = document.createElement('button');
      btn.className = 'call995-btn';
      btn.type = 'button';
      btn.textContent = 'Call 995';
      btn.onclick = function() { window.location.href = 'tel:995'; };
      bar.appendChild(btn);
    }
    if (show118) {
      const btn = document.createElement('button');
      btn.className = 'call118-btn';
      btn.type = 'button';
      btn.textContent = 'Call 118';
      btn.onclick = function() { window.location.href = 'tel:118'; };
      bar.appendChild(btn);
    }
    msgDiv.appendChild(bar);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // populates the static advice cards on the right side panel
  function renderGuide() {
    function guideCard(color, title, lines) {
      const escapeHtml = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const items = lines.map((l) => '<p class="insight-line">' + escapeHtml(l) + '</p>').join('');
      return '<section class="insight-card guide-card ' + color + '"><div class="insight-title">' + escapeHtml(title) + '</div>' + items + '</section>';
    }

    insightsGuide.innerHTML = [
      guideCard('gc-red', 'Call 995: Emergency', [
        'Chest pain or tightness',
        'Difficulty breathing / not breathing',
        'Suspected stroke (face drooping, arm weakness, slurred speech)',
        'Unconscious or unresponsive',
        "Severe bleeding that won\'t stop",
        'Seizures or loss of consciousness',
        'Major trauma or serious injury',
        'Severe allergic reaction (anaphylaxis)',
      ]),
      guideCard('gc-orange', 'Call 118: Non-Emergency Ambulance', [
        'Need transport but condition is NOT life-threatening',
        'Stable but unable to self-transport to a clinic',
        'Elderly or immobile patient needing a transfer',
        'If life is at risk, call 995 instead of 118',
      ]),
      guideCard('gc-amber', 'Go to A&E', [
        'Severe or rapidly worsening symptoms',
        'High fever with confusion or stiff neck',
        'Sudden severe headache (worst of your life)',
        'Chest pain not yet confirmed non-cardiac',
        'Serious injuries requiring imaging or surgery',
      ]),
      guideCard('gc-blue', 'See a GP or Polyclinic', [
        'Sore throat, cough, runny nose lasting a few days',
        'Mild to moderate fever (below 39 °C)',
        'Ear pain, eye discharge, mild rash',
        'Urinary discomfort',
        'Minor wounds or lacerations',
        'Chronic condition follow-up (diabetes, hypertension, etc.)',
        'Polyclinics offer subsidised rates for citizens and PRs',
      ]),
      guideCard('gc-green', 'Self-Care at Home', [
        'Common cold with mild symptoms',
        'Low-grade fever: rest, fluids, paracetamol',
        'Mild sore throat: honey, lozenges, warm drinks',
        'Minor cuts: clean, apply pressure, bandage',
        'Mild diarrhoea without blood: stay hydrated',
        'If symptoms worsen or persist beyond 3 days, see a GP',
      ]),
    ].join('');
  }

  // hides or shows the extra info panel which is handy for smaller screens
  function togglePanel() {
    workspace.classList.toggle('panel-hidden');
    panelToggle.innerText = workspace.classList.contains('panel-hidden') ? 'Show Panel' : 'Hide Panel';
  }

  // takes the clinic data we get from the backend and displays it in the clinics tab
  function renderClinics(clinics) {
    const escapeHtml = function(v) { return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    if (!clinics || clinics.length === 0) {
      insightsClinics.innerHTML = '<p class="clinics-placeholder">Enter a Patient NRIC above to see nearby clinics in this area.</p>';
      return;
    }
    var cards = '';
    for (var i = 0; i < clinics.length; i++) {
      var c = clinics[i];
      var isHSG = c.type && c.type.indexOf('Healthier SG') !== -1;
      var hsgTag = isHSG ? '<p class="insight-line" style="color:var(--hh-green);font-weight:600;">\u2713 Healthier SG Clinic</p>' : '';
      cards += '<section class="insight-card">'
        + '<div class="insight-title">' + escapeHtml(c.name) + '</div>'
        + '<p class="insight-line">\uD83D\uDCCD ' + escapeHtml(c.address) + '</p>'
        + '<p class="insight-line">\uD83D\uDCDE ' + escapeHtml(c.telephone) + '</p>'
        + hsgTag
        + '</section>';
    }
    insightsClinics.innerHTML = cards;
    switchTab('clinics');
  }

  // main function that talks to our cloudflare worker
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    history.push({ role: "user", content: text });

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
        const msgDiv = addMessage(data.response, 'bot');
        if (msgDiv) addCallButtons(msgDiv, data.shouldCall995 === true, data.shouldCall118 === true);
        renderClinics(data.clinics);
        history.push({ role: "assistant", content: data.response });
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

  renderGuide();
  renderClinics([]);
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

type PatientRow = {
  nric: string;
  name: string;
  age: number;
  sex: string;
  conditions: string;
  medications: string;
  allergies: string;
  last_visit: string;
  planning_area: string;
  address: string;
};

type ClinicRow = {
  name: string;
  address: string;
  telephone: string;
  type: string;
};

// simple safeguard to make sure we are always working with strings
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

// trims down the chat history to prevent sending too much text to the ai at once
function sanitizeHistory(h: any): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(h)) return [];
  const cleaned: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of h) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = asString(m?.content).trim();
    if (!role || !content) continue;
    cleaned.push({ role, content });
  }
  // keep the start of the chat for context and the most recent messages to follow the flow
  if (cleaned.length <= 20) return cleaned;
  return [...cleaned.slice(0, 2), ...cleaned.slice(-18)];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // just return our web page if someone visits the main url
    if (request.method === "GET") {
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    // handle incoming chat messages
    if (request.method === "POST") {
      try {
        const ai = new Ai(env.AI);

        // safely grab the data the frontend just sent us
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

        // check the database to see if we already know this patient's medical background
        let patientContext = "No patient record on file — ask the user about their medical history if relevant.";
        let patientArea = "";
        if (nric) {
          const patient = await env.DB
            .prepare("SELECT * FROM patients WHERE nric = ?")
            .bind(nric)
            .first<PatientRow>();

          if (patient) {
            patientArea = asString(patient.planning_area, "");
            const conditions = asString(patient.conditions, "[]");
            const meds = asString(patient.medications, "[]");
            const allergies = asString(patient.allergies, "[]");
            patientContext =
              `Name: ${asString(patient.name)}, Age: ${patient.age}, Sex: ${asString(patient.sex)}\n` +
              `Address: ${asString(patient.address)} (${patientArea})\n` +
              `Known Conditions: ${conditions === "[]" ? "None" : conditions}\n` +
              `Current Medications: ${meds === "[]" ? "None" : meds}\n` +
              `Allergies: ${allergies === "[]" ? "None" : allergies}\n` +
              `Last Visit: ${asString(patient.last_visit, "Unknown")}`;
          }
        }

        // we convert whatever language they are typing in over to english so our model processes it better
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

        // pull out our emergency keywords from the database
        const { results } = await env.DB.prepare(
          "SELECT topic, destination, trigger_any, immediate_actions, do_not FROM triage_rules"
        ).all<TriageRuleRow>();

        // glue all their messages together so we can search the whole conversation for danger signs
        const allUserText = [
          englishQuery,
          ...history.filter(m => m.role === "user").map(m => m.content),
        ].join(" ").toLowerCase();

        let matchedProtocol = "General Assessment";
        let urgency = "Standard";
        let advice = "Assess symptoms carefully.";
        let warnings = "";

        for (const rule of results || []) {
          const triggers = asString((rule as any).trigger_any)
            .split(";")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);

          if (triggers.some((t) => allUserText.includes(t))) {
            matchedProtocol = asString((rule as any).topic, matchedProtocol);
            urgency = asString((rule as any).destination, urgency);
            advice = asString((rule as any).immediate_actions, advice);
            warnings = asString((rule as any).do_not, warnings);
            break;
          }
        }

        // locate nearby clinics for the patient whenever we have their area
        let clinicsNearby: ClinicRow[] = [];
        if (patientArea) {
          const clinicResult = await env.DB.prepare(
            `SELECT name, address, telephone, type FROM clinics
             WHERE type LIKE '%Medical%' AND address LIKE ?
             ORDER BY name LIMIT 5`
          ).bind(`%${patientArea.toUpperCase()}%`).all<ClinicRow>();
          clinicsNearby = clinicResult.results || [];
        }

        const clinicSection = clinicsNearby.length > 0
          ? `NEARBY CLINICS (patient lives in ${patientArea}):\n${clinicsNearby.map(c => `- ${c.name}: ${c.address}, Tel: ${c.telephone}`).join("\n")}\nWhen you recommend GP or self-care, briefly mention 1–3 of these clinics by name.`
          : "";

        // keep track of how deep we are into the chat so we don't ask endless questions
        const exchangeCount = history.filter(m => m.role === "user").length;

        // feed all this context into a massive prompt so the ai knows exactly how to act
        const systemPrompt = `
You are a warm, professional Triage Assistant for Singapore's healthcare system.

## Patient Profile
${patientContext}

## PAC Triage Classification
PAC 1 — Resuscitation / Critically-ill: Cardiovascular collapse or imminent danger (e.g. heart attack, cardiac arrest, severe bleeding, severe asthma). → CALL 995 IMMEDIATELY
PAC 2 — Acutely-ill (Non-Ambulant): Severe distress, but stable vitals; early A&E care needed to prevent deterioration (e.g. stroke, long bone fracture, moderate asthma). → GO TO A&E
PAC 3 — Minor Emergency (Ambulant): Acute symptoms, can self-mobilise; mild to moderate severity (e.g. bleeding cuts, high persistent fever, moderate injuries). → SEE GP / POLYCLINIC
PAC 4 — Non-Emergency: No immediate threat; manageable at home or primary care (e.g. mild cold, chronic back pain, acne). → SELF-CARE or GP

## Matched Triage Protocol
- Condition recognised: ${matchedProtocol}
- Urgency level: ${urgency}
- Recommended actions: ${advice}
- What to avoid: ${warnings}

${clinicSection}

## Conversation Guidelines
1. GATHER BEFORE CONCLUDING: If this is an early exchange (exchange ${exchangeCount} of the conversation) and the symptoms are still vague, ask ONE focused follow-up question. Good questions: what specific symptoms, how long, severity (mild/moderate/severe), whether worsening, any other symptoms.
2. NATURAL FLOW: Do not ask multiple questions at once. One question per reply. Let the conversation build up naturally.
3. CONCLUDE AFTER ENOUGH INFO: Once you have symptom type, duration, and severity (typically 2–3 exchanges), give a clear triage recommendation including the PAC level.
4. IMMEDIATE RED FLAGS: Only skip assessment and immediately advise calling 995 if the patient has clearly described a severe or high-risk presentation — for example: severe chest pain, pain radiating to the arm or jaw, inability to breathe, confirmed stroke signs (face drooping, arm weakness, slurred speech), unconsciousness, or uncontrolled severe bleeding. If the symptom is mentioned but severity is still unknown (e.g. "I have chest pain" with no further detail), ask ONE targeted follow-up question about severity, duration, and associated symptoms (e.g. shortness of breath, sweating, radiation) before triaging. Do not default to 995 on vague symptom mentions alone.
5. NEVER instruct the patient to perform CPR or use an AED on themselves — CPR is only ever performed by someone else on a collapsed person. If relevant, tell them to ask a bystander or the 995 dispatcher to guide someone nearby.
6. CLINIC RECOMMENDATIONS: If the recommendation is PAC 3/4 (GP or self-care) and nearby clinics are listed above, mention 1–3 specific clinic names and addresses. IMPORTANT: Do NOT invent or include any hospital, A&E, or clinic addresses that are not in the NEARBY CLINICS section above. For PAC 1/2 emergencies, refer to "the nearest A&E" without specifying an address.
7. PATIENT CONTEXT: Refer to the patient's known conditions, medications, and allergies where clinically relevant (e.g. if they have asthma and describe breathing issues, flag it specifically).
8. LANGUAGE: Reply in ${language}.
9. STYLE: Conversational and concise. 2–4 short paragraphs max. No lengthy headers or bullet-point walls — adapt tone to the message. Do not use gratitude/apology phrases.
`.trim();

        // finally pass it all to the model to generate a reply
        const modelResponse: any = await ai.run("@cf/openai/gpt-oss-120b", {
          messages: [{ role: "system", content: systemPrompt }, ...history],
          max_tokens: 1024,
        });

        const text =
          asString(modelResponse?.choices?.[0]?.message?.content) ||
          asString(modelResponse?.response) ||
          asString(modelResponse?.result) ||
          "";

        // determine if we should light up the call buttons on the user interface
        let shouldCall995 = urgency === "AE";
        let shouldCall118 = urgency === "GP" || urgency === "POLYCLINIC";

        // always check the ai text for explicit emergency signals, regardless of db rule match
        const lowerText = text.toLowerCase();
        const textSays995 = lowerText.includes("call 995") || lowerText.includes("dial 995");
        const textSays118 = lowerText.includes("call 118") || lowerText.includes("dial 118");
        if (textSays995) shouldCall995 = true;
        if (textSays118) shouldCall118 = true;

        // suppress buttons when the AI is still mid-conversation (response ends with a question)
        // but never suppress 995 if the AI explicitly told the user to call 995
        const trimmedText = text.trimEnd();
        const stillAsking = trimmedText.endsWith("?") || trimmedText.endsWith("？");
        if (stillAsking) {
          if (!textSays995) shouldCall995 = false;
          if (!textSays118) shouldCall118 = false;
        }

        return new Response(
          JSON.stringify({
            response: text,
            shouldCall995,
            shouldCall118,
            clinics: clinicsNearby,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        console.error("POST / error:", e);
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  },
};