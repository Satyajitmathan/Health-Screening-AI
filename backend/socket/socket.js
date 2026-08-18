import {
  createSession,
  getSession,
  deleteSession,
} from "../sessions/sessionStore.js";

import { getNextAIResponse } from "../services/conversationService.js";
import { generateReport } from "../services/reportService.js";

const registerSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("start-call", () => {
      const session = createSession(socket.id);
      console.log("Call started:", session.id);
      socket.emit("call-started", { sessionId: session.id });
    });

    socket.on("user-message", async (userText) => {
      try {
        const session = getSession(socket.id);
        if (!session) {
          socket.emit("error-message", { message: "No active call session found." });
          return;
        }
        const aiResponse = await getNextAIResponse(socket.id, userText);
        socket.emit("ai-response", aiResponse);
      } catch (error) {
        console.error("AI response error:", error);
        socket.emit("error-message", { message: "Something went wrong while processing your response." });
      }
    });

    socket.on("end-call", async () => {
      const session = getSession(socket.id);
      if (!session) return;

      console.log("Call ended:", session.id);

      try {
        const report = await generateReport(session);

        socket.emit("call-ended", {
          sessionId: session.id,
          sessionHistory: session.sessionHistory,
          report,
        });
      } catch (error) {
        console.error("Report generation error:", error);
        socket.emit("call-ended", {
          sessionId: session.id,
          sessionHistory: session.sessionHistory,
          report: null,
        });
      } finally {
        deleteSession(socket.id);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      deleteSession(socket.id);
    });
  });
};

export default registerSocketEvents;