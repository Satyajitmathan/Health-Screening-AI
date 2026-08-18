import { useEffect, useRef, useState } from "react";

import socket from "../socket";
import { createSpeechRecognition, isSpeechRecognitionSupported, speakText, stopSpeaking } from "../speech";

import IdleCall from "./IdleCall";
import ScreeningReport from "./ScreeningReport";

const CallScreen = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [callEnded, setCallEnded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const recognitionRef = useRef(null);
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    socket.on("call-started", (data) => {
      setSessionId(data.sessionId);
      setIsCallActive(true);
      setCallEnded(false);
      setReport(null);
      setErrorMessage("");

      const greeting = {
        language: "en",
        displayText: "Hello! I will ask you a few basic health screening questions. What is your name?",
        speechText: "Hello! I will ask you a few basic health screening questions. What is your name?",
      };

      setMessages([{ role: "assistant", text: greeting.displayText }]);
      speakText(greeting.speechText, greeting.language);
    });

    socket.on("ai-response", (data) => {
      setIsAIResponding(false);
      setMessages((prev) => [...prev, { role: "assistant", text: data.displayText }]);
      speakText(data.speechText, data.language);
    });

    socket.on("call-ended", (data) => {
      setIsCallActive(false);
      setIsListening(false);
      setIsAIResponding(false);
      setCallEnded(true);
      setReport(data.report || null);

      stopSpeaking();
      if (recognitionRef.current) recognitionRef.current.stop();
    });

    socket.on("error-message", (data) => {
      console.error("Socket error:", data.message);
      setIsListening(false);
      setIsAIResponding(false);
      setErrorMessage(data.message || "Something went wrong. Please try again.");
    });

    return () => {
      socket.off("call-started");
      socket.off("ai-response");
      socket.off("call-ended");
      socket.off("error-message");
      stopSpeaking();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startCall = () => {
    setMessages([]);
    setSessionId(null);
    setReport(null);
    setCallEnded(false);
    setErrorMessage("");
    socket.emit("start-call");
  };

  const startListening = () => {
    if (!isCallActive || isAIResponding || isListening) return;

    if (!isSpeechRecognitionSupported) {
      setErrorMessage("Speech recognition is not supported. Please use Chrome or Edge.");
      return;
    }

    setErrorMessage("");
    stopSpeaking();

    const recognition = createSpeechRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();

      if (!transcript) {
        setErrorMessage("I couldn't understand that. Please try again.");
        return;
      }

      setMessages((prev) => [...prev, { role: "user", text: transcript }]);
      setIsAIResponding(true);
      socket.emit("user-message", transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "no-speech") {
        setErrorMessage("I couldn't hear anything. Please try speaking again.");
      } else if (event.error === "audio-capture") {
        setErrorMessage("Microphone unavailable. Please check your microphone.");
      } else if (event.error === "not-allowed") {
        setErrorMessage("Microphone permission is required to continue.");
      } else {
        setErrorMessage("Speech recognition failed. Please try again.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const endCall = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    stopSpeaking();
    socket.emit("end-call");
  };

  const micState = isListening ? "listening" : isAIResponding ? "responding" : "idle";

  return (
    <div className="min-h-screen bg-paper font-body text-ink flex flex-col items-center py-6 sm:py-10 px-3 sm:px-4">
      <div className="w-full max-w-xl">
        <header className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <p className="text-[10px] sm:text-xs font-mono tracking-widest text-ink/50 uppercase">
              Telehealth Intake
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
              Health Screening AI
            </h1>
          </div>
          {sessionId && (
            <span className="font-mono text-[10px] sm:text-[11px] text-ink/40 bg-white border border-ink/10 px-2 py-1 rounded shrink-0">
              {sessionId.slice(0, 10)}
            </span>
          )}
        </header>

        {errorMessage && (
          <div className="mb-4 flex items-start justify-between gap-3 bg-rose/5 border border-rose/20 rounded-xl px-4 py-3">
            <p className="text-sm text-rose">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage("")}
              className="text-rose/60 hover:text-rose text-xs font-mono uppercase shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {!isCallActive && !callEnded && <IdleCall onStart={startCall} />}

        {isCallActive && (
          <div className="bg-white rounded-2xl border border-ink/10 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center gap-4 py-6 sm:py-8 border-b border-ink/10 bg-teal-tint/40">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {micState !== "idle" && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-teal/30 animate-pulse-ring" />
                    <span
                      className="absolute inset-0 rounded-full bg-teal/30 animate-pulse-ring"
                      style={{ animationDelay: "0.6s" }}
                    />
                  </>
                )}
                <button
                  onClick={startListening}
                  disabled={isListening || isAIResponding}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-xl shadow-md transition-colors ${
                    micState === "listening"
                      ? "bg-teal"
                      : micState === "responding"
                      ? "bg-ink/60"
                      : "bg-teal hover:bg-teal/90"
                  }`}
                >
                  {micState === "responding" ? "…" : "●"}
                </button>
              </div>
              <p className="text-xs sm:text-sm font-mono text-ink/60 text-center px-4">
                {micState === "listening"
                  ? "Listening to you..."
                  : micState === "responding"
                  ? "AI is responding..."
                  : "Tap to speak"}
              </p>
            </div>

            <div className="max-h-64 sm:max-h-80 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 space-y-3">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-teal text-white rounded-br-sm"
                        : "bg-paper text-ink border border-ink/10 rounded-bl-sm"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            <div className="px-3 sm:px-5 pb-4 sm:pb-5">
              <button
                onClick={endCall}
                className="w-full border border-rose/30 text-rose font-medium py-2.5 rounded-full hover:bg-rose/5 transition-colors"
              >
                End Call
              </button>
            </div>
          </div>
        )}

        {callEnded && <ScreeningReport report={report} messages={messages} onStartNew={startCall} />}
      </div>
    </div>
  );
};

export default CallScreen;