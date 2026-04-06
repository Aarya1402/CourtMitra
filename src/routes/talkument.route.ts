import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { talkumentApiCall } from "../services/talkument.service.js";
import FormData from "form-data";
import axios from "axios";

const router = Router();
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * Prepares data for proxying, handling multipart/form-data if present
 */
const prepareMultipartData = (req: Request) => {
  if (!req.is("multipart/form-data")) {
    return { data: req.body, isMultipart: false };
  }

  const hasFile = !!req.file;
  const hasBody = Object.keys(req.body).length > 0;

  if (!hasFile && !hasBody) {
    return { data: req.body, isMultipart: false };
  }

  const formData = new FormData();
  if (req.file) {
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
  }

  for (const key in req.body) {
    formData.append(key, req.body[key]);
  }

  return { data: formData, isMultipart: true };
};

/**
 * Handles streaming responses for specific Talkument AI endpoints
 */
const handleStreamingResponse = async (
  req: Request,
  res: Response,
  endpoint: string,
  token: string | undefined,
  data: unknown,
  isMultipart: boolean,
) => {
  const axiosRes = await axios({
    method: req.method,
    url: `${process.env.TALKUMENT_API_BASE || "https://nighthack.api.talkument.co/api"}${endpoint}`,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      ...(isMultipart ? (data as FormData).getHeaders() : { "Content-Type": "application/json" }),
    },
    data: isMultipart ? data : req.body,
    responseType: "stream",
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  console.log(`[TalkumentProxy] Starting stream for ${endpoint}`);
  axiosRes.data.on("end", () => console.log(`[TalkumentProxy] Stream ended for ${endpoint}`));
  axiosRes.data.on("error", (err: Error) =>
    console.error(`[TalkumentProxy] Stream error for ${endpoint}:`, err),
  );

  axiosRes.data.pipe(res);
};

/**
 * Handles setting authentication cookies upon successful sign-in or callback
 */
const handleAuthCookies = (
  res: Response,
  endpoint: string,
  method: string,
  responseData: Record<string, unknown>,
) => {
  const isAuthAction = endpoint === "/auth/signin" || endpoint === "/auth/callback";
  if (isAuthAction && method === "POST") {
    const accessToken = responseData.access_token as string | undefined;
    if (accessToken) {
      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
  }
};

/**
 * Standard error handler for the proxy
 */
const handleProxyError = (res: Response, req: Request, error: unknown) => {
  const err = error as { message?: string; response?: { data: unknown; status: number } };
  console.error(`[TalkumentProxy] Error in ${req.method} ${req.path}:`, err.message);

  if (err.response) {
    const errorData = err.response.data;
    const errorStatus = err.response.status;

    // Log error safely without stringifying potentially circular objects (like streams)
    console.error(
      `[TalkumentProxy] API Response Error (${errorStatus}):`,
      typeof errorData === "string" ? errorData.substring(0, 200) : "Complex/Stream Data",
    );

    // If it's a circular object (like a stream response error), don't pass it directly to .json()
    // Extract only serializable properties if it's an object, or send a default message
    const safeErrorData =
      typeof errorData === "object" && errorData !== null
        ? { message: (errorData as any).message || err.message, status: errorStatus } // Fallback to safe info
        : errorData;

    return res.status(errorStatus).json(safeErrorData);
  }

  return res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "Error communicating with Talkument API",
  });
};

export const handleTalkumentProxy = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<Response | void> => {
  try {
    const endpoint = req.params[0] ? `/${req.params[0]}` : req.path;
    const token = req.cookies.token;

    console.log(`[TalkumentProxy] ${req.method} ${endpoint} (Auth: ${!!token})`);

    const { data, isMultipart } = prepareMultipartData(req);

    if (endpoint.includes("/bots/agui/interact")) {
      return await handleStreamingResponse(req, res, endpoint, token, data, isMultipart);
    }

    const responseData = (await talkumentApiCall(
      req.method,
      endpoint,
      data,
      token,
      req.query,
      isMultipart,
    )) as Record<string, unknown>;

    handleAuthCookies(res, endpoint, req.method, responseData);
    return res.status(200).json(responseData);
  } catch (error: unknown) {
    return handleProxyError(res, req, error);
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};

router.post("/auth/logout", logout);

// Catch-all route for Talkument API
router.all(
  /.*/,
  upload.single("file"),
  handleTalkumentProxy as unknown as import("express").RequestHandler,
);

export default router;
