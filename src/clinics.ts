import type { ChatMessage, ClinicRecommendation } from "./types";
import { asString, normalize } from "./utils";

// identify a location name from a user's text
export function extractLocationFromText(text: string): string | null {
  const input = text.trim();
  if (!input) return null;

  // look out for such phrases
  const patterns = [
    /\b(?:i\s+)?(?:stay|live|am\s+located)\s+(?:in|at)\s+([a-z0-9\s\-]{2,80})$/i, // (?:...) is non capturng grp
    /\b(?:in|at)\s+([a-z0-9\s\-]{2,80})$/i,
  ];

  for (const pattern of patterns) {
    const m = input.match(pattern);
    if (m?.[1]) return m[1].trim(); // m[1] contains only the text inside that first set of parentheses
  }

  const normalized = normalize(input);
  const symptomWords = ["pain", "fever", "cough", "vomit", "dizzy", "bleeding", "breath", "symptom", "headache"];
  
  // checks if input is short and doesn't contain the symtomWords (prevent accidentally seeing it as a location)
  if (normalized && normalized.split(" ").length <= 6 && !symptomWords.some((w) => normalized.includes(w))) {
    return input;
  }

  return null; // no location found
}

export function resolveUserLocation(query: string, history: ChatMessage[], patientRecord: any): string | null {
  const planningArea = asString(patientRecord?.planning_area).trim(); // check patient's record
  const address = asString(patientRecord?.address).trim();
  if (planningArea || address) {
    return [planningArea, address].filter(Boolean).join(", "); // join area and address, e.g. Tampines, Street...
  }

  const fromQuery = extractLocationFromText(query); // OR check if user metioned their loc in the new msg
  if (fromQuery) return fromQuery;

  for (let i = history.length - 1; i >= 0; i -= 1) { // check history if they have mentioned it before
    const msg = history[i];
    if (msg.role !== "user") continue; // only look at user msg, not AO
    const fromHistory = extractLocationFromText(msg.content);
    if (fromHistory) return fromHistory;
  }

  return null; // no location found
}

export async function findClosestClinics(
  db: D1Database,
  location: string, // from resolveUserLocation
  limit = 3
): Promise<ClinicRecommendation[]> {
  const normalizedLocation = normalize(location);
  const locationTokens = normalizedLocation.split(" ").filter((t) => t.length >= 3);

  const searchTerms = [normalizedLocation, ...locationTokens].filter(Boolean).slice(0, 8);
  const whereClauses = searchTerms.map(() => "instr(lower(name || ' ' || address), ?) > 0");
  const sql = `
    SELECT name, address, COALESCE(telephone, '') AS telephone, COALESCE(type, '') AS type
    FROM clinics
    WHERE (lower(type) LIKE '%medical%' OR lower(type) LIKE '%polyclinic%' OR lower(type) LIKE '%clinic%')
      AND (${whereClauses.length ? whereClauses.join(" OR ") : "1 = 1"})
    LIMIT 500 
  `; // limits to 500 potential clinics matches

  const { results } = await db.prepare(sql).bind(...searchTerms).all<any>();

  const ranked = (results || [])
    .map((clinic) => {
      const clinicText = normalize(`${asString(clinic.name)} ${asString(clinic.address)}`);
      let score = 0;

      // rank the clinics to find best matches
      if (normalizedLocation && clinicText.includes(normalizedLocation)) score += 100;
      for (const token of locationTokens) {
        if (clinicText.includes(token)) score += 8;
      }

      return { clinic, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit) // limit is defined above, so here it wld only return 3 clinics
    .map(({ clinic }) => ({
      name: asString(clinic.name),
      address: asString(clinic.address),
      telephone: asString(clinic.telephone),
    }));

  return ranked;
}
