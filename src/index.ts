import { Ai } from "@cloudflare/ai";
import { html } from "./html";
import {
  asString,
  extractAssistantText,
  sanitizeHistory,
  buildModelHistory,
  ensureCurrentUserMessage,
  runModelWithRetries,
} from "./utils";
import {
  buildKnownFactsList,
  deriveWhyTriage,
  deriveMissingCriticalInfo,
  derivePacCategory,
  buildFallbackClinicalReply,
  hasRecentChecklistDenied,
  countRecentNegativeUserAnswers,
  hasImmediateEmergencyDirective,
  isEmergencyUrgency,
  isNonEmergencyUrgency,
  asksForClinicRecommendation,
  isAffirmativeReply,
  recentlyOfferedClinicSuggestion,
  alreadyAskedForLocation,
} from "./triage";
import { resolveUserLocation, findClosestClinics } from "./clinics";
import type { Env, TriageRuleRow, PacCategoryRow, ClinicRecommendation } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    if (request.method === "POST") {
      try {
        const ai = new Ai(env.AI);
        const body = (await request.json().catch(() => ({}))) as {
          query?: string;
          nric?: string;
          language?: string;
          history?: any;
        };

        const query = asString(body.query).trim();
        const nric = asString(body.nric).trim().toUpperCase();
        const language = asString(body.language || "English").trim() || "English";
        const history = ensureCurrentUserMessage(sanitizeHistory(body.history), query);

        if (!query) {
          return new Response(JSON.stringify({ error: "Missing query." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 1) PATIENT LOOKUP (D1)
        let patientContext = "No patient record found.";
        let patientRecord: any = null;
        if (nric) {
          const patient = await env.DB
            .prepare("SELECT * FROM patients WHERE nric = ?")
            .bind(nric)
            .first<any>();

          if (patient) {
            patientRecord = patient;
            patientContext =
              `Patient: ${asString(patient.name, "Unknown")}, Age: ${asString(patient.age, "Unknown")}, Sex: ${asString(patient.sex, "Unknown")}, ` +
              `Conditions: ${asString(patient.conditions, "None")}, Medications: ${asString(patient.medications, "None")}, Allergies: ${asString(patient.allergies, "None")}`;

            const residence = [asString(patient.planning_area), asString(patient.address)].filter(Boolean).join(", ");
            if (residence) {
              patientContext += `, Residence: ${residence}`;
            }
          }
        }

        // Translate using SEA-LION
        let englishQuery = query;
        if (language !== "English") {
          try {
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
          } catch (e) {
            englishQuery = query;
          }
        }

        // Rule matching
        const { results } = await env.DB.prepare(
          "SELECT topic, destination, trigger_any, immediate_actions, do_not FROM triage_rules"
        ).all<TriageRuleRow>();

        let pacRows: PacCategoryRow[] = [];
        try {
          const { results: pacRowsRaw } = await env.DB.prepare(
            "SELECT category, title, description, examples FROM pac_categories"
          ).all<PacCategoryRow>();
          pacRows = (pacRowsRaw || []) as PacCategoryRow[];
        } catch (e: any) {
          const msg = asString(e?.message).toLowerCase();
          if (!msg.includes("no such table: pac_categories")) {
            throw e;
          }
        }

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

        const pacCategory = derivePacCategory(englishQuery, pacRows);

        const checklistDenied = hasRecentChecklistDenied(history);
        const knownFactsList = buildKnownFactsList(history, query);
        const knownFacts = knownFactsList.length ? knownFactsList.map((l) => `- ${l}`).join("\n") : "- No stable facts extracted yet.";

        // Prompt
        const systemPrompt = `
You are an official SCDF Triage Assistant helping patients in Singapore decide on the right level of care.

TRIAGE PROTOCOL MATCHED:
- Condition: ${matchedProtocol}
- Urgency Code: ${urgency} (AE = Emergency, GP = General Practitioner, POLYCLINIC = Polyclinic, SELF_CARE = Manage at Home)
- Required Actions: ${advice}
- Do Not: ${warnings}

PATIENT CONTEXT:
${patientContext}

KNOWN FACTS FROM THIS CHAT (DO NOT FORGET OR RE-ASK THESE UNLESS CONFLICTING):
${knownFacts}

CLINICAL ASSESSMENT — HOW TO GATHER INFORMATION:
- Use your own clinical judgment to decide whether you have enough information for a confident triage assessment.
- If key information is still missing (e.g. duration, severity, associated symptoms, medical history), ask for it.
- There is NO cap on the total number of questions you may ask across the conversation.
- However, ask ONLY ONE question per reply. Never list multiple questions in a single message.
- Before asking a question, review the conversation history. Do NOT ask about anything the patient has already answered.
- Do not repeat a broad symptom checklist question once it has already been asked and answered.
- Once you have enough information to triage confidently, stop asking and give your assessment.
- For clear-cut life-threatening emergencies (e.g. chest pain, difficulty breathing, suspected stroke, severe bleeding, loss of consciousness), direct to 995/A&E immediately without delay.
- In follow-up replies for the same case, avoid repeating the full same safety paragraph verbatim; keep repeated reminders to one short sentence unless risk changes.

CLINIC SUGGESTIONS — PROACTIVE ROUTING:
- For non-emergency cases (GP, POLYCLINIC, SELF_CARE), proactively help the patient find care.
- If the patient's location is known, you may mention that nearby clinic options will be shown.
- If the location is unknown, ask "Would you like me to suggest some nearby clinics?" and if yes, ask which area they are in.
- Do NOT provide specific clinic names, addresses, phone numbers, or opening hours yourself. The system appends verified clinic data automatically.
- Never output placeholder text such as "(clinic list will be displayed here)" or similar variants.
- For emergency (AE) cases, do NOT ask to find/list nearest A&E locations. Instead, instruct immediate 995/A&E action directly.

INSTRUCTIONS:
1. Reply in ${language}.
2. If Urgency is AE, tell the patient to call 995 or go to A&E immediately. Do not delay.
3. For non-emergency cases where the patient cannot self-transport (stable but immobile), advise calling 118 for a non-emergency ambulance.
4. Be calm, concise, and professional. Treat every patient with care.
5. Do not use fixed templates or section headings in your replies.
6. Do not use gratitude or apology phrases unless the patient is clearly distressed.
7. Keep continuity: if prior turn already gave plan and warning signs, avoid restating the same full block again.
8. If location/clinic recommendation was requested and enough details are available, proceed directly instead of asking redundant intermediate questions.
${checklistDenied ? "9. The patient already denied a broad symptom checklist; do NOT ask another broad checklist. Ask a different focused question or conclude triage." : ""}
`.trim();

        let modelResponse: any;
        let usedFallbackReply = false;
        try {
          modelResponse = await runModelWithRetries(ai, systemPrompt, history);
        } catch (e) {
          console.error("AI inference failed after all model retries.");
          usedFallbackReply = true;
        }

        let text =
          usedFallbackReply
            ? buildFallbackClinicalReply(query, history, urgency, advice, knownFactsList)
            : extractAssistantText(modelResponse);

        if (!text.trim()) {
          text = buildFallbackClinicalReply(query, history, urgency, advice, knownFactsList);
        }

        const responseLower = text.toLowerCase();

        const responseHasImmediateEmergencyDirective =
          hasImmediateEmergencyDirective(responseLower) ||
          responseLower.includes("need emergency care right now") ||
          responseLower.includes("requires emergency care now");

        const shouldCall995 = isEmergencyUrgency(urgency) || responseHasImmediateEmergencyDirective;

        const shouldCall118 =
          !shouldCall995 &&
          (advice.toLowerCase().includes("118") ||
            advice.toLowerCase().includes("non-emergency ambulance") ||
            advice.toLowerCase().includes("non emergency ambulance") ||
            responseLower.includes("call 118") ||
            responseLower.includes("non-emergency ambulance") ||
            responseLower.includes("non emergency ambulance"));

        let responseText = text;
        // Remove any model-generated clinic placeholders; the app renders real clinic entries below.
        responseText = responseText
          .replace(/\(?\s*[Cc]linic\s+list\s+will\s+(?:be|eb)\s+displa\w*\s+here\s*\)?\.?\s*/gi, "")
          .replace(/^\s*[-•*]?\s*\(?\s*clinic\s+list\s+will\s+(?:be|eb)\s+displa\w*\s+here\s*\)?\s*$/gim, "")
          .replace(/^\s*would you like me to (?:help you )?find the nearest a\s*&?\s*e\??\s*$/gim, "")
          .replace(/^\s*here are the nearest accident\s*&\s*emergency\s*\(a\s*&?\s*e\)\s*departments.*$/gim, "")
          .replace(/^\s*here are the nearest a\s*&?\s*e.*$/gim, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        if (
          shouldCall995 &&
          !/\b(?:call|dial)\s*995\b/i.test(responseText) &&
          !/\bgo\s+(?:directly\s+)?to\s+(?:the\s+)?a\s*&?\s*e\b/i.test(responseText)
        ) {
          responseText += "\n\nPlease call 995 now or go directly to the nearest A&E.";
        }

        if (!responseText.trim()) {
          responseText = shouldCall995
            ? "You need emergency care right now. Please call 995 or go directly to the nearest A&E."
            : buildFallbackClinicalReply(query, history, urgency, advice, knownFactsList);
        }

        const looksLikeClinicList =
          /bedok polyclinic|clinic\s*\|\s*address|\bmon-fri\b|\bsat\b|\bsingapore\s*\d{6}/i.test(responseText);
        if (looksLikeClinicList) {
          responseText = "Based on your condition, seeing a doctor is appropriate. Verified nearby clinic options are shown below.";
        }

        const priorClinicTurn = history.some(
          (m) =>
            m.role === "assistant" &&
            (m.content.toLowerCase().includes("nearby clinic") ||
              m.content.toLowerCase().includes("closest gp") ||
              m.content.toLowerCase().includes("suggest") && m.content.toLowerCase().includes("clinic"))
        );

        let botIsStillAsking = responseText.trimEnd().endsWith("?");
        const recentNegativeAnswers = countRecentNegativeUserAnswers(history);

        if (
          botIsStillAsking &&
          !shouldCall995 &&
          recentNegativeAnswers >= 3 &&
          isNonEmergencyUrgency(urgency, advice)
        ) {
          responseText =
            "Thanks for clarifying. Based on your answers, this appears to be a non-emergency flu-like illness without current danger signs. Rest, hydrate well, and monitor symptoms. Please see a GP or polyclinic for assessment today since symptoms have persisted. If you develop chest pain, breathing difficulty, persistent high fever, confusion, repeated vomiting, or worsening condition, call 995 or go to A&E immediately.";
          botIsStillAsking = false;
        }

        const shouldOfferClinics =
          !shouldCall995 &&
          !botIsStillAsking &&
          (isNonEmergencyUrgency(urgency, advice) ||
            priorClinicTurn ||
            asksForClinicRecommendation(query) ||
            (isAffirmativeReply(query) && recentlyOfferedClinicSuggestion(history)));

        const resolvedLocation = resolveUserLocation(query, history, patientRecord);
        let recommendedClinics: ClinicRecommendation[] = [];

        if (shouldOfferClinics) {
          const userLocation = resolvedLocation;

          if (userLocation) {
            const recommendations = await findClosestClinics(env.DB, userLocation, 2);
            recommendedClinics = recommendations;
            if (recommendations.length > 0) {
              const clinicLines = recommendations
                .map((c, i) => `${i + 1}. ${c.name} — ${c.address}${c.telephone ? ` (${c.telephone})` : ""}`)
                .join("\n");
              responseText += `\n\nNearby clinics in ${userLocation}:\n${clinicLines}`;
            } else if (!alreadyAskedForLocation(history)) {
              responseText += "\n\nI can suggest nearby clinics. Could you let me know which estate or area you're in (e.g. Tampines, Bedok, Jurong)?";
            }
          } else if (!alreadyAskedForLocation(history)) {
            responseText += "\n\nWould you like me to suggest nearby clinics? If so, please share your area or estate (e.g. Tampines, Jurong, Bishan).";
          }
        }

        if (recommendedClinics.length === 0 && resolvedLocation) {
          recommendedClinics = await findClosestClinics(env.DB, resolvedLocation, 3);
        }

        const meta = {
          urgency,
          matchedProtocol,
          pacCategory,
          whyTriage: deriveWhyTriage(urgency, matchedProtocol, knownFactsList, patientRecord),
          capturedFacts: knownFactsList.map((f) => f.replace(/^(Timing|Size|Depth|Bleeding|Medication|Patient answer|Symptom detail):\s*/i, "")),
          missingCriticalInfo: deriveMissingCriticalInfo(botIsStillAsking, responseText, knownFactsList),
          nextAction: advice,
          watchouts: warnings,
          patientLocation: resolvedLocation,
          nearbyClinics: recommendedClinics,
          patient: patientRecord
            ? {
                name: asString(patientRecord.name, "Unknown"),
                age: asString(patientRecord.age, "Unknown"),
                sex: asString(patientRecord.sex, "Unknown"),
                conditions: asString(patientRecord.conditions, "None"),
                medications: asString(patientRecord.medications, "None"),
                allergies: asString(patientRecord.allergies, "None"),
                planningArea: asString(patientRecord.planning_area, "Unknown"),
                address: asString(patientRecord.address, "Unknown"),
              }
            : null,
        };

        return new Response(JSON.stringify({ response: responseText, shouldCall995, shouldCall118, meta }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e: any) {
        console.error("POST / error:", e);
        return new Response(
          JSON.stringify({
            response:
              "I'm having a temporary system issue. Please seek in-person care now at a GP clinic or polyclinic. If symptoms worsen or you develop warning signs such as confusion, severe headache, rapid breathing, chest/abdominal pain, persistent vomiting, or inability to stay upright, call 995 or go to A&E now.",
            shouldCall995: false,
            shouldCall118: false,
            meta: null,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
