import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { talkumentApiCall } from "../services/talkument.service.js";
import FormData from "form-data";
import axios from "axios";

const router = Router();
const upload = multer();

export const handleTalkumentProxy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    const endpoint = req.params[0] ? `/${req.params[0]}` : req.path;
    const token = req.cookies.token;

    console.log(`[TalkumentProxy] ${req.method} ${endpoint} (Auth: ${!!token})`);

    let data = req.body;
    let isMultipart = false;

    if (req.is("multipart/form-data") && req.file) {
      isMultipart = true;
      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      for (const key in req.body) {
        formData.append(key, req.body[key]);
      }
      data = formData;
    } else if (
      req.is("multipart/form-data") &&
      Object.keys(req.body).length > 0
    ) {
      // Just in case it's multipart without file
      isMultipart = true;
      const formData = new FormData();
      for (const key in req.body) {
        formData.append(key, req.body[key]);
      }
      data = formData;
    }
    const isStreaming = endpoint.includes("/bots/agui/interact");
    if (isStreaming) {
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
      axiosRes.data.on("end", () => console.log(`[TalkumentProxy] Stream ended for ${endpoint}`));
      axiosRes.data.on("error", (err: any) => console.error(`[TalkumentProxy] Stream error for ${endpoint}:`, err));
      
      axiosRes.data.pipe(res);
      return;
    }

    const responseData = await talkumentApiCall(
      req.method,
      endpoint,
      data,
      token,
      req.query,
      isMultipart,
    );

    if (
      (endpoint === "/auth/signin" || endpoint === "/auth/callback") &&
      req.method === "POST"
    ) {
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

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error(`[TalkumentProxy] Error in ${req.method} ${req.path}:`, error.message);
    if (error.response) {
      console.error(`[TalkumentProxy] API Response Error (${error.response.status}):`, JSON.stringify(error.response.data).substring(0, 200));
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({
      error: error.message || "Error communicating with Talkument API",
    });
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
