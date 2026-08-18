const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export const isSpeechRecognitionSupported = Boolean(SpeechRecognition);

// FIXED to "en-IN" - not a toggle. The PDF only requires the conversation to
// WORK in Hindi or English, not a language switcher UI. "en-IN" recognition
// handles English cleanly AND transcribes Hindi/Hinglish speech in Roman
// script (imperfectly, but readable - e.g. "mujhe bukhar hai"), which is
// exactly what we want since Gemini's displayText must stay Roman-script
// per the system prompt. Switching to "hi-IN" forces Devanagari output from
// the browser, which we don't want here.
export const createSpeechRecognition = () => {
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-IN";

  return recognition;
};

// NOTE: speakText's language param is UNRELATED to the recognition fix above -
// this is for TEXT-TO-SPEECH output only. Gemini already decides whether to
// respond in English or Hindi/Hinglish (via its own language detection) and
// sends back { language: "en" | "hi", speechText }. This function just picks
// the right voice/accent for whichever language Gemini already chose - it's
// not a user-facing toggle, so we keep it as-is.
const getBestVoice = (language) => {
  const voices = window.speechSynthesis.getVoices();

  if (!voices.length) {
    return null;
  }

  if (language === "hi") {
    return (
      voices.find((voice) => voice.lang.toLowerCase() === "hi-in") ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("hi")) ||
      voices.find((voice) => voice.name.toLowerCase().includes("hindi")) ||
      null
    );
  }

  return (
    voices.find((voice) => voice.lang.toLowerCase() === "en-in") ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    null
  );
};

export const speakText = (text, language = "en") => {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis is not supported.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getBestVoice(language);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
  }

  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};