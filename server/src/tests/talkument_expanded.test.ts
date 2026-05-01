import { jest } from "@jest/globals";
import FormData from "form-data";
import fs from "node:fs";
import path from "node:path";

// Mock axios and sarvamai
jest.unstable_mockModule("axios", () => ({
  default: jest.fn().mockImplementation(async (config: any) => {
    if (config.url?.endsWith("/auth/signin")) {
      return { data: { access_token: "mock-token" } };
    }
    if (config.url?.endsWith("/bots/agui/interact")) {
      const { Readable } = await import("node:stream");
      const stream = new Readable();
      stream.push("data: hello");
      stream.push(null);
      return { data: stream };
    }
    if (config.url?.includes("/error")) {
      const error: any = new Error("Mocked API Error");
      error.response = { status: 403, data: { message: "Forbidden" } };
      throw error;
    }
    return { data: { success: true } };
  }),
}));

const { app } = await import("../app.js");
const request = (await import("supertest")).default;

describe("Expanded Talkument Routes", () => {
  it("should set cookie on successful signin", async () => {
    const res = await request(app)
      .post("/api/talkument/auth/signin")
      .send({ email: "test@example.com", password: "password" });
    
    expect(res.status).toBe(200);
    expect(res.header["set-cookie"]).toBeDefined();
    expect(res.header["set-cookie"][0]).toContain("token=mock-token");
  });

  it("should handle streaming response for interact endpoint", async () => {
    const res = await request(app)
      .post("/api/talkument/bots/agui/interact")
      .send({ prompt: "hello" });
    
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("data: hello");
  });

  it("should handle multipart data with file", async () => {
    const axiosMock = (await import("axios")).default as unknown as jest.Mock;
    axiosMock.mockClear();

    const tempFile = "test-upload.txt";
    fs.writeFileSync(tempFile, "hello world");

    await request(app)
      .post("/api/talkument/upload")
      .attach("file", tempFile)
      .field("name", "test-file");

    expect(axiosMock).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        "content-type": expect.stringContaining("multipart/form-data"),
      })
    }));

    fs.unlinkSync(tempFile);
  });

  it("should handle proxy errors with specific status", async () => {
    const res = await request(app).get("/api/talkument/error");
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  it("should handle server errors in proxy gracefully", async () => {
    const axiosMock = (await import("axios")).default as unknown as jest.Mock<any>;
    axiosMock.mockRejectedValueOnce(new Error("Network Error"));
    
    const res = await request(app).get("/api/talkument/any");
    expect(res.status).toBe(500);
    expect(res.body.message).toContain("Network Error");
  });
});
