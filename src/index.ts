import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { SarvamAIClient } from 'sarvamai';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cookieParser from 'cookie-parser';
import { getTranscript } from './processAudio.js';
import { rateLimit } from "express-rate-limit";
import talkumentRoutes from "./routes/talkument.route.js";
import geminiRoutes from './routes/gemini.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: "draft-8", // Formatted RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: { error: "Too many requests, please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // Limit each IP to 10 requests per minute
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many AI extraction requests, please try again later.",
  },
});

// Apply global rate limiting
app.use(globalLimiter);

// Talkument Proxy API (matches any route starting with /api/talkument)
app.use('/api/talkument', talkumentRoutes);

// Gemini extraction API
app.use("/api/gemini", aiLimiter, geminiRoutes);

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY as string
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected for streaming transcription');
  let sarvamSocket: any = null;

  ws.on('message', async (message: Buffer, isBinary: boolean) => {
    if (!isBinary) {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === 'start') {
          const langCode = msg.language || "gu-IN";
          console.log(`Starting Sarvam stream: model=saaras:v3, language=${langCode}, sampleRate=${msg.sampleRate}`);
          try {
            sarvamSocket = await client.speechToTextStreaming.connect({
              model: "saaras:v3",
              mode: "transcribe",
              "language-code": langCode,
              "Api-Subscription-Key": process.env.SARVAM_API_KEY,
              input_audio_codec: "wav",
              sample_rate: msg.sampleRate.toString(),
            } as any);

            sarvamSocket.on("open", () => {
              console.log("Connected to Sarvam WS successfully");
              ws.send(JSON.stringify({ type: 'ready' }));
            });

            sarvamSocket.on("message", (sarvamMsg: any) => {
               console.log("Message from Sarvam:", JSON.stringify(sarvamMsg));
               if (sarvamMsg.type === 'data' && sarvamMsg.data) {
                 ws.send(JSON.stringify({ type: 'transcript', data: sarvamMsg.data }));
               } else if (sarvamMsg.type === 'error') {
                 console.error("Sarvam reported error in message:", sarvamMsg.data);
                 ws.send(JSON.stringify({ type: 'error', message: 'Sarvam Error', details: sarvamMsg.data }));
               } else {
                 // Forward events if needed, but labeled
                 ws.send(JSON.stringify({ type: 'event', data: sarvamMsg }));
               }
            });

            sarvamSocket.on("close", () => {
              console.log("Sarvam WS closed");
              ws.send(JSON.stringify({ type: 'closed' }));
            });

            sarvamSocket.on("error", (err: any) => {
              console.error("Sarvam WS error:", err);
              ws.send(JSON.stringify({ type: 'error', message: 'Sarvam WS Error', details: err?.message }));
            });
            
          } catch (e: any) {
            console.error("Failed to connect to Sarvam initialization:", e);
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to connect to Sarvam', details: e?.message }));
          }
        } else if (msg.type === 'stop') {
           console.log("Stopping stream (flush)");
           if (sarvamSocket && sarvamSocket.readyState === 1) sarvamSocket.flush();
        }
      } catch (e) {
        console.error("Error parsing control message:", e);
      }
    } else {
      // Binary audio data
      if (sarvamSocket && sarvamSocket.readyState === 1) { // 1 = OPEN
        sarvamSocket.transcribe({
           audio: message.toString('base64'),
           sample_rate: 16000,
           encoding: "audio/wav"
        });
      } else if (sarvamSocket) {
        // Log if we are receiving data but socket isn't open yet
        // console.log(`Sarvam socket state: ${sarvamSocket.readyState}`);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from local WS');
    if (sarvamSocket) {
      try { sarvamSocket.close(); } catch (e) {}
    }
  });

  ws.on('error', (err) => {
    console.error('Local WS error:', err);
  });
});

app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filePath = req.file.path;
    const transcriptText = await getTranscript(filePath);

    // Cleanup uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(200).json({ transcript: transcriptText });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: error.message || 'Server error during transcription' });
  }
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
