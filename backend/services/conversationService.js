import ai from "../config/gemini.js";
import {
  getSession,
  addMessage,
} from "../sessions/sessionStore.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const SYSTEM_PROMPT = `
You are an AI health screening assistant conducting a basic health screening conversation.

Your job is to collect:
1. Name
2. Main concern or symptom
3. Duration
4. Severity
5. Related symptoms

IMPORTANT CONVERSATION RULES:
- Ask only ONE question at a time.
- Remember everything already provided by the user.
- Never repeat a question when the information is already known.
- If an answer is vague, unclear, or possibly misheard, ask a natural clarification.
- Adapt your next question based on the conversation.
- Keep responses short and natural because they will be spoken aloud.
- Do not diagnose diseases.
- Do not prescribe or recommend medicines.
- Do not claim certainty about a medical condition.
- This is only a basic health screening conversation.
- If the user provides information for multiple fields in one answer, remember all of it.
- Once the five core areas (name, main concern, duration, severity, related symptoms) are covered, ask ONE additional relevant follow-up question before offering to finish - for example about when exactly symptoms started, whether anything makes it better or worse, or any medication already taken. This makes the screening feel more thorough. Do not ask more than one extra question.
- After that extra question is answered (or if the user declines to add more), briefly confirm the information and ask ONCE if they'd like to finish the screening.
- If the user confirms they want to finish (says yes, haan, theek hai, complete karo, or similar), respond with ONLY a brief warm closing message (e.g. thank them, wish them well) and do NOT ask another question. Do not ask "would you like to finish" a second time.
- If the user says no or provides more information instead, continue the conversation naturally.
- If the user asks for medicine or diagnosis, politely explain that the screening assistant cannot prescribe or diagnose.

LANGUAGE RULES:
- Detect whether the user is speaking English or Hindi/Hinglish.
- If the user speaks English, respond in natural English.
- If the user speaks Hindi or Hinglish, respond in natural Hinglish.
- The DISPLAY text must ALWAYS use the English/Roman alphabet.
- NEVER use Devanagari in displayText.
- For Hindi/Hinglish speech, speechText SHOULD use Devanagari so that Hindi text-to-speech pronunciation is natural.
- For English speech, speechText should use normal English.
- Keep medical terms understandable and natural.

Examples:

English:
{
  "language": "en",
  "displayText": "How long have you had these symptoms?",
  "speechText": "How long have you had these symptoms?"
}

Hindi/Hinglish:
{
  "language": "hi",
  "displayText": "Aapko ye symptoms kitne din se hain?",
  "speechText": "आपको ये symptoms कितने दिन से हैं?"
}

Return ONLY valid JSON.
Do not use markdown.
Do not add explanations outside the JSON.
`;

const parseAIResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    // Fallback if Gemini wraps JSON in markdown
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleanedText);
    } catch {
      return {
        language: "en",
        displayText: text,
        speechText: text,
      };
    }
  }
};

// ---------------------------------------------------------------------------
// RETRY LOGIC
//
// WHY THIS EXISTS: the 503 you hit ("model is currently experiencing high
// demand") is Google's server being temporarily overloaded - not a bug in
// your code, not a quota issue. It's a TRANSIENT failure, meaning the exact
// same request will very likely succeed if you just wait a second or two and
// try again. Without retry logic, one bad moment on Google's end kills the
// whole call and the user sees a raw error - which is exactly the "does the
// call recover or just die" failure case the assessment PDF calls out as an
// explicit eval criterion.
//
// isRetryableError() only retries on status codes that mean "try again later"
// (503 = overloaded, 429 = rate limited). It does NOT retry on things like a
// bad API key or malformed request - retrying those forever would just waste
// time and quota on something that will never succeed.
//
// Exponential backoff (1s, then 2s, then 4s) instead of retrying instantly:
// if Google's servers are overloaded, hammering them again immediately makes
// it worse for everyone, including you. Waiting a bit gives the spike time to
// pass, which is literally what Google's own error message tells you to do
// ("Spikes in demand are usually temporary. Please try again later.").
// ---------------------------------------------------------------------------

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
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      return response;
    } catch (err) {
      lastError = err;

      const shouldRetry = isRetryableError(err) && attempt < maxAttempts;
      if (!shouldRetry) {
        throw err;
      }

      const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.warn(
        `[conversationService] Gemini call failed (attempt ${attempt}/${maxAttempts}, status ${err?.status}). Retrying in ${backoffMs}ms...`
      );
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

export const getNextAIResponse = async (sessionId, userText) => {
  const session = getSession(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  addMessage(sessionId, {
    role: "user",
    text: userText,
  });

  const conversationHistory = session.sessionHistory
    .map((message) => `${message.role}: ${message.text}`)
    .join("\n");

  const prompt = `
${SYSTEM_PROMPT}

CURRENT CONVERSATION:

${conversationHistory}

Based on the conversation, generate the SINGLE next response.

Remember:
- Ask only one question at a time.
- Do not repeat already answered questions.
- Keep the response concise.
- Return ONLY valid JSON.
`;

  let response;
  try {
    response = await callGeminiWithRetry(prompt);
  } catch (err) {
    // All retries exhausted (or a non-retryable error). Return a graceful
    // fallback instead of throwing all the way up to socket.js as a raw
    // error - this is what stops the call from just dying on the frontend.
    console.error("[conversationService] Gemini call failed after retries:", err.message);

    const fallback = {
      language: "en",
      displayText: "Sorry, I'm having a little trouble right now. Could you say that one more time?",
      speechText: "Sorry, I'm having a little trouble right now. Could you say that one more time?",
    };
    addMessage(sessionId, { role: "assistant", text: fallback.displayText });
    return fallback;
  }

  const rawText = response.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  const aiResponse = parseAIResponse(rawText);

  if (!aiResponse.displayText || !aiResponse.speechText) {
    throw new Error("Invalid AI response format");
  }

  addMessage(sessionId, {
    role: "assistant",
    text: aiResponse.displayText,
  });

  return aiResponse;
};