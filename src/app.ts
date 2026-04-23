import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import cookieParser from "cookie-parser";
import { getTranscript } from "./processAudio.js";
import { rateLimit } from "express-rate-limit";
import talkumentRoutes from "./routes/talkument.route.js";
import orderRoutes from "./routes/order.route.js";

export const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) =>
      callback(null, true),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per minute to accommodate tests
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many AI extraction requests, please try again later.",
  },
});

// Routes
app.use("/api/talkument", talkumentRoutes);
app.use("/api/order", aiLimiter, orderRoutes);

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      const filePath = req.file.path;
      const language = req.body.language || "gu-IN";
      console.log(`[Transcription] Received request for file: ${req.file.originalname} with language: ${language}`);
      const transcriptText = await getTranscript(filePath, language);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(200).json({ transcript: transcriptText });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Server error during transcription";
      console.error("Transcription error:", error);
      return res.status(500).json({ error: errorMsg });
    }
  },
);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "Server is operational" });
});

Sentry.setupExpressErrorHandler(app);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Express Error:", err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});
