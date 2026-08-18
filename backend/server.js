import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";

import registerSocketEvents from "./socket/socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.json({
    message: "Health Screening AI Backend is running",
  });
});

// Register Socket.IO events
registerSocketEvents(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});