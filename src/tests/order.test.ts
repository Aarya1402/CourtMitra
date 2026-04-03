import { jest } from "@jest/globals";

// Define a shared mock function to control behavior across all instances
const mockCompletions = jest.fn() as any;

jest.unstable_mockModule("sarvamai", () => ({
  SarvamAIClient: jest.fn().mockImplementation(() => ({
    chat: {
      completions: mockCompletions,
    },
  })),
}));

const { app } = await import("../app.js");
const request = (await import("supertest")).default;

describe("Order Controller", () => {
  beforeEach(() => {
    process.env.SARVAM_API_KEY = "mock-key";
    jest.clearAllMocks();

    // Default success mock behavior
    mockCompletions.mockImplementation(async (options: any) => {
      const prompt = options.messages[0].content;
      if (prompt.includes("Translate")) {
        return {
          choices: [{ message: { content: JSON.stringify({ translated: "data" }) } }],
        };
      }
      return {
        choices: [
          { message: { content: JSON.stringify({ header: { court_name: "Mock Court" } }) } },
        ],
      };
    });
  });

  describe("POST /api/order/extract", () => {
    it("should return 400 if chunk is missing", async () => {
      const res = await request(app).post("/api/order/extract").send({});
      expect(res.status).toBe(400);
    });

    it("should return extracted JSON on success", async () => {
      const res = await request(app)
        .post("/api/order/extract")
        .send({ chunk: "Court proceeding text" });
      expect(res.status).toBe(200);
      expect(res.body.result).toEqual({ header: { court_name: "Mock Court" } });
    });

    it("should handle truncated AI response", async () => {
      mockCompletions.mockResolvedValueOnce({
        choices: [{ message: { content: '{"incomplete": "json' } }],
      });

      const res = await request(app).post("/api/order/extract").send({ chunk: "text" });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain("truncated");
    });

    it("should handle complete JSON parsing failure", async () => {
      mockCompletions.mockResolvedValueOnce({
        choices: [{ message: { content: "Total garbage}" } }],
      });

      const res = await request(app).post("/api/order/extract").send({ chunk: "text" });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain("Failed to parse");
    });

    it("should handle Sarvam AI API failure", async () => {
      mockCompletions.mockRejectedValueOnce(new Error("API Down"));

      const res = await request(app).post("/api/order/extract").send({ chunk: "text" });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("API Down");
    });

    it("should successfully extract JSON when AI returns extra preamble text", async () => {
      mockCompletions.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                'Sure, here is the legal data: {"header": {"court_name": "Pre text Court"}} End of message.',
            },
          },
        ],
      });

      const res = await request(app).post("/api/order/extract").send({ chunk: "text" });
      expect(res.status).toBe(200);
      expect(res.body.result.header.court_name).toBe("Pre text Court");
    });

    it("should handle mixed markdown and JSON", async () => {
      mockCompletions.mockResolvedValueOnce({
        choices: [
          { message: { content: '```json\n{"header": {"court_name": "Markdown Court"}}\n```' } },
        ],
      });

      const res = await request(app).post("/api/order/extract").send({ chunk: "text" });
      expect(res.status).toBe(200);
      expect(res.body.result.header.court_name).toBe("Markdown Court");
    });
  });

  describe("POST /api/order/translate", () => {
    it("should return 400 if orderData is missing", async () => {
      const res = await request(app).post("/api/order/translate").send({});
      expect(res.status).toBe(400);
    });

    it("should return translated JSON on success", async () => {
      const res = await request(app)
        .post("/api/order/translate")
        .send({ orderData: { key: "value" }, language: "Hindi" });
      expect(res.status).toBe(200);
      expect(res.body.result).toEqual({ translated: "data" });
    });

    it("should handle parse failure in translation", async () => {
      mockCompletions.mockResolvedValueOnce({
        choices: [{ message: { content: "Invalid json" } }],
      });

      const res = await request(app)
        .post("/api/order/translate")
        .send({ orderData: { something: "else" } });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain("Failed to parse");
    });

    it("should handle Sarvam AI Translation failure", async () => {
      mockCompletions.mockRejectedValueOnce(new Error("Translation API Down"));

      const res = await request(app)
        .post("/api/order/translate")
        .send({ orderData: { key: "value" } });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Translation API Down");
    });
  });
});
