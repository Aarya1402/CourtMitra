import { jest } from "@jest/globals";

// Mock axios BEFORE anything else
jest.unstable_mockModule("axios", () => ({
  default: jest.fn().mockImplementation(async (config: unknown) => {
    const cfg = config as { url: string };
    if (cfg.url.includes("/api/auth/logout")) {
      return { data: { message: "Mocked Logout" } };
    }
    if (cfg.url.includes("/error")) {
      throw new Error("Mocked API Error");
    }
    return { data: { success: true } };
  }),
}));

const { app } = await import("../app.js");
const request = (await import("supertest")).default;

describe("Talkument Routes", () => {
  it("should logout successfully and clear cookie", async () => {
    const res = await request(app).post("/api/talkument/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
    expect(res.header["set-cookie"]).toBeDefined();
    expect(res.header["set-cookie"][0]).toContain("token=;");
  });

  it("should return 500 when talkument proxy fails", async () => {
    const res = await request(app).get("/api/talkument/error");
    expect(res.status).toBe(500);
  });

  it("should pass through auth token if provided in cookies", async () => {
    const axiosMock = (await import("axios")).default as unknown as jest.Mock;
    axiosMock.mockClear();

    await request(app).get("/api/talkument/test-proxy").set("Cookie", ["token=mock-token"]);

    // Check if axios was called with the token
    expect(axiosMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      }),
    );
  });
});
