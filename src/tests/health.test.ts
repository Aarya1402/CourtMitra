import request from "supertest";
import { app } from "../index.js";

describe("Server Verification", () => {
  it("should respond to /health endpoint", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "OK",
      message: "Server is operational",
    });
  });
});
