import { Request, Response, NextFunction } from "express";
import FormData from "form-data";
import { talkumentApiCall } from "../services/talkument.service.js";

export const handleTalkumentProxy = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<Response> => {
  try {
    const endpoint = req.params[0] ? `/${req.params[0]}` : req.path;
    const token = req.cookies.token; // Changed to use cookie

    let data: unknown = req.body;
    let isMultipart = false;

    if (req.is("multipart/form-data") && req.file) {
      isMultipart = true;
      const formData = new FormData();
      formData.append("file", req.file.buffer, req.file.originalname);
      // Append other body fields if any
      for (const key in req.body) {
        formData.append(key, req.body[key]);
      }
      data = formData;
    }

    const responseData = (await talkumentApiCall(
      req.method,
      endpoint,
      data,
      token,
      req.query,
      isMultipart,
    )) as Record<string, unknown>;

    // If it's signin, set the cookie
    if (endpoint === "/auth/signin" && req.method === "POST") {
      const accessToken = responseData.access_token as string | undefined;
      if (accessToken) {
        res.cookie("token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      }
    }

    return res.status(200).json(responseData);
  } catch (error: unknown) {
    const err = error as { response?: { status: number; data: unknown }; message?: string };
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(500).json({ error: err.message || "Error communicating with Talkument API" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};
