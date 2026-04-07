import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { transcribeAudio } from "../utils/sarvamTranscription";
import * as Sentry from "@sentry/react";
import { reportError, logMessage } from "../utils/sentryReporter";
import { saveThreadState, loadThreadState } from "../utils/storageUtils";

vi.mock("axios");
vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe("Utils Coverage", () => {
  describe("sarvamTranscription", () => {
    it("should transcribe audio successfully", async () => {
      const mockBlob = new Blob(["test"], { type: "audio/webm" });
      (axios.post as any).mockResolvedValueOnce({
        data: { transcript: "Hello World" },
      });

      const result = await transcribeAudio(mockBlob);
      expect(result).toBe("Hello World");
      expect(axios.post).toHaveBeenCalledWith("/api/transcribe", expect.any(FormData), expect.any(Object));
    });

    it("should throw NO_CONTENT_DETECTED if transcript is missing", async () => {
      const mockBlob = new Blob(["test"], { type: "audio/webm" });
      (axios.post as any).mockResolvedValueOnce({
        data: {},
      });

      await expect(transcribeAudio(mockBlob)).rejects.toThrow("NO_CONTENT_DETECTED");
    });

    it("should throw error if axial call fails", async () => {
      const mockBlob = new Blob(["test"], { type: "audio/webm" });
      (axios.post as any).mockRejectedValueOnce(new Error("Network Error"));

      await expect(transcribeAudio(mockBlob)).rejects.toThrow("Network Error");
    });
  });

  describe("sentryReporter", () => {
    it("should report error to sentry", () => {
        const error = new Error("Test Error");
        const context = { key: "value" };
        reportError(error, context);
        expect(Sentry.captureException).toHaveBeenCalledWith(error, { extra: context });
    });

    it("should log message to sentry breadcrumbs", () => {
        logMessage("Test Message", "warning");
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            category: "app",
            message: "Test Message",
            level: "warning"
        });
    });
  });

  describe("storageUtils", () => {
    let mockRequest: any;
    let mockStore: any;
    let mockDb: any;

    beforeEach(() => {
        mockRequest = { onsuccess: null, onerror: null, result: null };
        mockStore = {
            put: vi.fn(() => mockRequest),
            get: vi.fn(() => mockRequest)
        };
        mockDb = {
            transaction: vi.fn(() => ({
                objectStore: vi.fn(() => mockStore)
            }))
        };

        const mockOpenRequest = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDb };
        vi.stubGlobal("indexedDB", {
            open: vi.fn(() => mockOpenRequest)
        });
    });

    it("should return early if no threadId in saveThreadState", async () => {
        await saveThreadState("", {});
        expect(indexedDB.open).not.toHaveBeenCalled();
    });

    it("should return null if no threadId in loadThreadState", async () => {
        const result = await loadThreadState("");
        expect(result).toBeNull();
    });

    it("should handle successful save", async () => {
        const savePromise = saveThreadState("t1", { data: 1 });
        
        const openRequest = (indexedDB.open as any).mock.results[0].value;
        openRequest.onsuccess();

        // Yield to allow the async saveThreadState to continue and set onsuccess
        await Promise.resolve();

        mockRequest.onsuccess();

        await expect(savePromise).resolves.not.toThrow();
    });

    it("should handle successful load", async () => {
        const loadPromise = loadThreadState("t1");
        
        const openRequest = (indexedDB.open as any).mock.results[0].value;
        openRequest.onsuccess();

        // Yield to allow the async loadThreadState to continue and set onsuccess
        await Promise.resolve();

        mockRequest.result = { saved: true };
        mockRequest.onsuccess();

        const result = await loadPromise;
        expect(result).toEqual({ saved: true });
    });
    
    it("should handle DB open error", async () => {
        const loadPromise = loadThreadState("t1");
        const openRequest = (indexedDB.open as any).mock.results[0].value;
        openRequest.error = new Error("DB Fail");
        openRequest.onerror();
        await expect(loadPromise).rejects.toThrow("DB Fail");
    });

    it("should handle onupgradeneeded", async () => {
        saveThreadState("t1", {});
        const openRequest = (indexedDB.open as any).mock.results[0].value;
        const mockTarget = { result: { objectStoreNames: { contains: vi.fn(() => false) }, createObjectStore: vi.fn() } };
        openRequest.onupgradeneeded({ target: mockTarget });
        expect(mockTarget.result.createObjectStore).toHaveBeenCalledWith("ThreadStateStore");
    });

    it("should handle put error", async () => {
        const savePromise = saveThreadState("t1", {});
        const openRequest = (indexedDB.open as any).mock.results[0].value;
        openRequest.onsuccess();
        await Promise.resolve();
        mockRequest.error = new Error("Put Fail");
        mockRequest.onerror();
        await expect(savePromise).rejects.toThrow("Put Fail");
    });

    it("should handle get error", async () => {
        const loadPromise = loadThreadState("t1");
        const openRequest = (indexedDB.open as any).mock.results[0].value;
        openRequest.onsuccess();
        await Promise.resolve();
        mockRequest.error = new Error("Get Fail");
        mockRequest.onerror();
        await expect(loadPromise).rejects.toThrow("Get Fail");
    });
  });
});
