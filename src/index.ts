import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { SarvamAIClient } from "sarvamai";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY as string,
});

interface SarvamWSResponse {
  type: string;
  data?: unknown;
  message?: string;
}

interface ClientControlMessage {
  type: string;
  language?: string;
  sampleRate?: number;
}

const handleSarvamMessage = (ws: WebSocket, sarvamMsg: SarvamWSResponse) => {
  if (sarvamMsg.type === "data" && sarvamMsg.data) {
    ws.send(JSON.stringify({ type: "transcript", data: sarvamMsg.data }));
    return;
  }

  if (sarvamMsg.type === "error") {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Sarvam Error",
        details: sarvamMsg.data,
      }),
    );
    return;
  }

  ws.send(JSON.stringify({ type: "event", data: sarvamMsg }));
};

const initializeSarvamStream = async (ws: WebSocket, msg: ClientControlMessage) => {
  const langCode = msg.language || "gu-IN";
  const sarvamSocket = await client.speechToTextStreaming.connect({
    model: "saaras:v3",
    mode: "transcribe",
    "language-code": langCode,
    "Api-Subscription-Key": process.env.SARVAM_API_KEY,
    input_audio_codec: "wav",
    sample_rate: msg.sampleRate?.toString() || "16000",
  } as unknown as Parameters<typeof client.speechToTextStreaming.connect>[0]);

  sarvamSocket.on("open", () => ws.send(JSON.stringify({ type: "ready" })));
  sarvamSocket.on("message", (sarvamMsg: unknown) =>
    handleSarvamMessage(ws, sarvamMsg as SarvamWSResponse),
  );
  sarvamSocket.on("close", () => ws.send(JSON.stringify({ type: "closed" })));
  sarvamSocket.on("error", (err: Error) => {
    ws.send(JSON.stringify({ type: "error", message: "Sarvam WS Error", details: err?.message }));
  });

  return sarvamSocket;
};

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  let sarvamSocket: Awaited<ReturnType<typeof initializeSarvamStream>> | null = null;

  ws.on("message", async (message: Buffer, isBinary: boolean) => {
    if (isBinary) {
      if (sarvamSocket?.readyState === 1) {
        sarvamSocket.transcribe({
          audio: message.toString("base64"),
          sample_rate: 16000,
          encoding: "audio/wav",
        });
      }
      return;
    }

    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === "start") {
        sarvamSocket = await initializeSarvamStream(ws, msg);
      } else if (msg.type === "stop" && sarvamSocket?.readyState === 1) {
        sarvamSocket.flush();
      }
    } catch (e) {
      console.error("Error parsing control message:", e);
    }
  });

  ws.on("close", () => {
    if (sarvamSocket) sarvamSocket.close();
  });
});

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
