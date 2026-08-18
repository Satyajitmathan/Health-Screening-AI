import ai from "../config/gemini.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const REPORT_SYSTEM_PROMPT = `
You are a medical intake assistant. You will be given a transcript of a voice health-screening call between an AI and a patient.

Your job is to produce a structured report a doctor could glance at in a few seconds before seeing the patient. Do NOT just repeat the transcript - synthesize and summarize it in your own words.

If the call was very short (e.g. only one exchange, or the user ended it immediately), do NOT invent information. Clearly mark the screening as incomplete and only report what was actually said.

IMPORTANT - SCOPE RULES (this is a basic screening summary, not a diagnosis):
- Do NOT state or imply that the patient has a specific disease or medical condition.
- Do NOT use urgency language like "requires immediate medical assessment" or "significant acute illness" unless the user explicitly described an emergency (e.g. chest pain, difficulty breathing, severe bleeding).
- For "flaggedForFollowUp" and "summary", prefer neutral phrasing such as "Follow-up with a healthcare professional may be appropriate" instead of clinical-sounding conclusions.
- You are summarizing what the patient reported, not assessing or diagnosing it.

Return ONLY valid JSON in exactly this shape, no markdown, no extra text:
{
  "patientName": "name mentioned, or 'Not provided'",
  "mainConcern": "1-2 sentence summary of the primary complaint, or 'Not provided'",
  "duration": "how long the issue has been going on, or 'Not provided'",
  "severity": "severity in plain terms as the patient described it, or 'Not provided'",
  "relatedSymptoms": "summary of other symptoms mentioned, or 'None mentioned'",
  "flaggedForFollowUp": "anything worth a doctor's attention, phrased neutrally (see scope rules above), or null if nothing stood out",
  "callCompleteness": "complete" or "partial" or "very_limited",
  "summary": "a short 2-4 sentence paragraph giving the overall picture, in plain professional English, following the scope rules above"
}
`;

function formatTranscript(sessionHistory) {
  if (!sessionHistory || sessionHistory.length === 0) {
    return "(No conversation took place - the call ended immediately.)";
  }
  return sessionHistory
    .map((m) => `${m.role === "user" ? "Patient" : "AI"}: ${m.text}`)
    .join("\n");
}

function parseReportJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function isRetryableError(err) {
  const status = err?.status || err?.error?.code;
  return status === 503 || status === 429;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(prompt, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
    } catch (err) {
      lastError = err;
      const shouldRetry = isRetryableError(err) && attempt < maxAttempts;
      if (!shouldRetry) throw err;
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(
        `[reportService] Gemini call failed (attempt ${attempt}/${maxAttempts}, status ${err?.status}). Retrying in ${backoffMs}ms...`
      );
      await sleep(backoffMs);
    }
  }
  throw lastError;
}

function buildFallbackReport(sessionHistory) {
  const hasAnyConversation = sessionHistory && sessionHistory.length > 0;
  return {
    patientName: "Not provided",
    mainConcern: "Not provided",
    duration: "Not provided",
    severity: "Not provided",
    relatedSymptoms: "None mentioned",
    flaggedForFollowUp: null,
    callCompleteness: "very_limited",
    summary: hasAnyConversation
      ? "The report could not be generated automatically due to a temporary issue, but a conversation did take place. Please review the raw transcript."
      : "The call ended before any information could be collected.",
    generatedVia: "fallback",
  };
}

export const generateReport = async (session) => {
  const transcript = formatTranscript(session.sessionHistory);

  const prompt = `
${REPORT_SYSTEM_PROMPT}

CALL TRANSCRIPT:
${transcript}

Return the JSON report now.
`;

  try {
    const response = await callGeminiWithRetry(prompt);
    const rawText = response.text;

    if (!rawText) {
      throw new Error("Gemini returned an empty response for report");
    }

    const parsed = parseReportJSON(rawText);
    if (!parsed) {
      console.error("[reportService] Could not parse report JSON:", rawText);
      return buildFallbackReport(session.sessionHistory);
    }

    return { ...parsed, generatedVia: "gemini" };
  } catch (err) {
    console.error("[reportService] Report generation failed after retries:", err.message);
    return buildFallbackReport(session.sessionHistory);
  }
};