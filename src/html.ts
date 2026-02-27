export const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Symptom Checker — Triage Assistant</title>
  <style>
    :root {
      color-scheme: light;
      --hh-green: #1a6640;
      --hh-green-dark: #144f32;
      --hh-green-light: #e8f4ed;
      --hh-green-mid: #2d8653;
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

    /* ── Top bar mimicking HealthHub nav ── */
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

    /* ── Page body ── */
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

    /* ── Tool header (inside card) ── */
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

    /* ── Settings bar ── */
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

    /* ── Workspace ── */
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

    .call995-btn,
    .call118-btn {
      background: #fff;
      color: #b91c1c;
      border: 1px solid #f5b8b8;
      padding: 5px 12px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.80rem;
      min-width: auto;
    }

    .call995-btn:hover,
    .call118-btn:hover {
      background: #fff5f5;
    }

    /* ── Insights pane ── */
    .insights-pane {
      background: #fff;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .insights-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border-bottom: 1px solid var(--border);
      background: #f9fbf9;
    }

    .tab-btn {
      min-width: 0;
      padding: 10px 8px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0;
      letter-spacing: 0.02em;
    }

    .tab-btn:hover { color: var(--hh-green); }

    .tab-btn.active {
      border-bottom-color: var(--hh-green);
      color: var(--hh-green);
      background: #fff;
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

    .triage-badge {
      display: inline-block;
      margin-bottom: 8px;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 4px;
      padding: 3px 8px;
      border: 1px solid #b2d4be;
      background: var(--hh-green-light);
      color: var(--hh-green-dark);
    }

    .triage-badge.emergency {
      background: #fff1f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .guide-card { border-left: 3px solid #d4dbd4; }
    .guide-card.gc-red    { border-left-color: #dc2626; }
    .guide-card.gc-orange { border-left-color: #ea580c; }
    .guide-card.gc-amber  { border-left-color: #d97706; }
    .guide-card.gc-blue   { border-left-color: #5ec7ff; }
    .guide-card.gc-green  { border-left-color: #16a34a; }
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

<!-- HealthHub-style top navigation -->
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
      <div class="insights-tabs">
        <button type="button" class="tab-btn active" data-tab="patient" onclick="setTab('patient')">Patient</button>
        <button type="button" class="tab-btn" data-tab="nearby" onclick="setTab('nearby')">Nearby</button>
        <button type="button" class="tab-btn" data-tab="guide" onclick="setTab('guide')">Guide</button>
      </div>
      <div class="insights-content" id="insightsContent"></div>
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
  const insightsContent = document.getElementById('insightsContent');
  let activeTab = 'patient';
  let latestMeta = null;
  let history = [];

  function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

  function sanitizeForDisplay(text) {
    return String(text || "")
      .replace(/\\*\\*/g, "")
      .replace(/^\\s*\\*\\s+/gm, "• ");
  }

  function addMessage(text, sender) {
    if (!String(text || "").trim()) return;
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
    button.onclick = () => { window.location.href = 'tel:995'; };
    wrapper.appendChild(button);
    messagesDiv.appendChild(wrapper);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function addCall118Button() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message actions';
    const button = document.createElement('button');
    button.className = 'call118-btn';
    button.type = 'button';
    button.innerText = 'Call 118';
    button.onclick = () => { window.location.href = 'tel:118'; };
    wrapper.appendChild(button);
    messagesDiv.appendChild(wrapper);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function formatValue(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text === '[]') return 'None';
    const noBrackets = text.replace(/[\\[\\]\"]/g, '');
    return noBrackets.split(',').map((s) => s.trim()).filter(Boolean).join(', ') || 'None';
  }

  function card(title, lines, extraHtml = '') {
    const escapeHtml = (value) => String(value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const body = (lines || []).filter(Boolean)
      .map((line) => '<p class="insight-line">' + escapeHtml(line) + '</p>').join('');
    return '<section class="insight-card"><div class="insight-title">' + escapeHtml(title) + '</div>' + extraHtml + body + '</section>';
  }

  function renderInsights() {
    if (!latestMeta) {
      insightsContent.innerHTML = card('Status', ['No assessment yet. Start the chat to populate triage insights.']);
      return;
    }
    if (activeTab === 'patient') {
      const patient = latestMeta.patient;
      const pac = latestMeta.pacCategory;
      const patientCard = patient
        ? card('Patient Snapshot', [
            'Name: ' + (patient.name || 'Unknown'),
            'Age/Sex: ' + (patient.age || 'Unknown') + ' / ' + (patient.sex || 'Unknown'),
            'Conditions: ' + formatValue(patient.conditions || 'None'),
            'Medications: ' + formatValue(patient.medications || 'None'),
            'Allergies: ' + formatValue(patient.allergies || 'None'),
          ])
        : card('Patient Snapshot', ['No NRIC record loaded in this session.']);
      const pacCard = pac
        ? card('PAC Lens', [
            'Category: ' + (pac.category || 'Unknown'),
            pac.title || '',
            pac.description || '',
            pac.examples ? ('Examples: ' + pac.examples) : '',
            pac.confidence ? ('Match confidence: ' + pac.confidence) : '',
          ])
        : '';
      insightsContent.innerHTML = patientCard + pacCard;
      return;
    }
    if (activeTab === 'nearby') {
      const clinics = latestMeta.nearbyClinics || [];
      insightsContent.innerHTML = clinics.length
        ? clinics.map((c, i) => card('Clinic ' + (i + 1), [
            c.name, c.address, c.telephone ? ('Tel: ' + c.telephone) : '',
          ])).join('')
        : card('Nearby Clinics', ['No nearby clinic suggestions yet.']);
      return;
    }
    renderGuideTab();
  }

  function renderGuideTab() {
    function guideCard(color, title, lines) {
      const escapeHtml = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const items = lines.map((l) => '<p class="insight-line">' + escapeHtml(l) + '</p>').join('');
      return '<section class="insight-card guide-card ' + color + '"><div class="insight-title">' + escapeHtml(title) + '</div>' + items + '</section>';
    }
    insightsContent.innerHTML = [
      guideCard('gc-red', 'Call 995 — Emergency', [
        'Chest pain or tightness',
        'Difficulty breathing / not breathing',
        'Suspected stroke (face drooping, arm weakness, slurred speech)',
        'Unconscious or unresponsive',
        "Severe bleeding that won't stop",
        'Seizures or loss of consciousness',
        'Major trauma or serious injury',
        'Severe allergic reaction (anaphylaxis)',
      ]),
      guideCard('gc-orange', 'Call 118 — Non-Emergency Ambulance', [
        'Need transport but condition is NOT life-threatening',
        'Stable but unable to self-transport to a clinic',
        'Elderly or immobile patient needing a transfer',
        '⚠ If life is at risk, call 995 — not 118',
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
        'Polyclinics offer subsidised rates for citizens & PRs',
      ]),
      guideCard('gc-green', 'Self-Care at Home', [
        'Common cold with mild symptoms',
        'Low-grade fever — rest, fluids, paracetamol',
        'Mild sore throat — honey, lozenges, warm drinks',
        'Minor cuts — clean, apply pressure, bandage',
        'Mild diarrhoea without blood — stay hydrated',
        'If symptoms worsen or persist beyond 3 days, see a GP',
      ]),
    ].join('');
  }

  function togglePanel() {
    workspace.classList.toggle('panel-hidden');
    panelToggle.innerText = workspace.classList.contains('panel-hidden') ? 'Show Panel' : 'Hide Panel';
  }

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    if (tab === 'guide') {
      renderGuideTab();
    } else {
      renderInsights();
    }
  }

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
        addMessage(data.response, 'bot');
        if (data.shouldCall995 === true) addCall995Button();
        if (data.shouldCall118 === true) addCall118Button();
        history.push({ role: "assistant", content: data.response });
        latestMeta = data.meta || null;
        renderInsights();
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

  renderInsights();
</script>
</body>
</html>
`;
