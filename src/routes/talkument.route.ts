import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { talkumentApiCall } from "../services/talkument.service.js";
import FormData from "form-data";
import axios from "axios";

const router = Router();
const upload = multer();

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
  data: any,
  isMultipart: boolean,
) => {
  const axiosRes = await axios({
    method: req.method,
    url: `${process.env.TALKUMENT_API_BASE || "https://nighthack.api.talkument.co/api"}${endpoint}`,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      ...(isMultipart
        ? data.getHeaders()
        : { "Content-Type": "application/json" }),
    },
    data: isMultipart ? data : req.body,
    responseType: "stream",
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  console.log(`[TalkumentProxy] Starting stream for ${endpoint}`);
  axiosRes.data.on("end", () =>
    console.log(`[TalkumentProxy] Stream ended for ${endpoint}`),
  );
  axiosRes.data.on("error", (err: any) =>
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
  responseData: any,
) => {
  const isAuthAction =
    endpoint === "/auth/signin" || endpoint === "/auth/callback";
  if (isAuthAction && method === "POST") {
    const accessToken = responseData.access_token;
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
const handleProxyError = (res: Response, req: Request, error: any) => {
  console.error(
    `[TalkumentProxy] Error in ${req.method} ${req.path}:`,
    error.message,
  );
  if (error.response) {
    console.error(
      `[TalkumentProxy] API Response Error (${error.response.status}):`,
      JSON.stringify(error.response.data).substring(0, 200),
    );
    return res.status(error.response.status).json(error.response.data);
  }
  return res.status(500).json({
    error: error.message || "Error communicating with Talkument API",
  });
};

export const handleTalkumentProxy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    const endpoint = req.params[0] ? `/${req.params[0]}` : req.path;
    const token = req.cookies.token;

    console.log(
      `[TalkumentProxy] ${req.method} ${endpoint} (Auth: ${!!token})`,
    );

    const { data, isMultipart } = prepareMultipartData(req);

    if (endpoint.includes("/bots/agui/interact")) {
      return await handleStreamingResponse(
        req,
        res,
        endpoint,
        token,
        data,
        isMultipart,
      );
    }

    const responseData = await talkumentApiCall(
      req.method,
      endpoint,
      data,
      token,
      req.query,
      isMultipart,
    );

    handleAuthCookies(res, endpoint, req.method, responseData);
    return res.status(200).json(responseData);
  } catch (error: any) {
    return handleProxyError(res, req, error);
  }
};


export const logout = (req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};

router.post("/auth/logout", logout);

// Catch-all route for Talkument API
router.all(/.*/, upload.single("file"), handleTalkumentProxy as any);

export default router;
