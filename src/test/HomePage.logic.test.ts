import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

import {
  uploadDocument,
  fetchThreads,
  fetchUser,
  deleteThread,
  createEmptyThread,
  isLoggedIn,
} from "./../pages/HomePage/HomePage.logic";

vi.mock("axios");

const mockedAxios = axios as any;

describe("HomePage.logic API tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ uploadDocument
  it("should create thread and upload file", async () => {
    const mockFile = new File(["test"], "test.pdf");
    const botId = "bot123";

    mockedAxios.post
      .mockResolvedValueOnce({
        data: { thread_id: "thread123" },
      })
      .mockResolvedValueOnce({});

    const result = await uploadDocument(mockFile, botId);

    expect(result).toBe("thread123");
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("should throw error if upload fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Upload failed"));

    await expect(
      uploadDocument(new File([""], "file.pdf"), "bot123")
    ).rejects.toThrow();
  });

  // ✅ fetchThreads
  it("should return threads", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { threads: ["t1", "t2"] },
    });

    const result = await fetchThreads("bot123");

    expect(result).toEqual(["t1", "t2"]);
  });

  it("should return empty array if no botId", async () => {
    const result = await fetchThreads("");

    expect(result).toEqual([]);
  });

  // ✅ fetchUser
  it("should return user data", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { name: "Krish" },
    });

    const result = await fetchUser();

    expect(result).toEqual({ name: "Krish" });
  });

  // ✅ deleteThread
  it("should call delete API", async () => {
    mockedAxios.delete.mockResolvedValue({});

    await deleteThread("thread123");

    expect(mockedAxios.delete).toHaveBeenCalled();
  });

  // ✅ createEmptyThread
  it("should create empty thread", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { thread_id: "newThread" },
    });

    const result = await createEmptyThread("bot123");

    expect(result).toBe("newThread");
  });

  // ✅ isLoggedIn
  it("should return username if logged in", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { name: "Krish" },
    });

    const result = await isLoggedIn();

    expect(result).toBe("Krish");
  });

  it("should throw error if deleteThread fails", async () => {
    const error = new Error("Delete failed");

    mockedAxios.delete.mockRejectedValue(error);

    await expect(deleteThread("thread123")).rejects.toThrow("Delete failed");

    expect(mockedAxios.delete).toHaveBeenCalled();
  });

  it("should throw error if createEmptyThread fails", async () => {
    const error = new Error("Create failed");

    mockedAxios.post.mockRejectedValue(error);

    await expect(createEmptyThread("bot123")).rejects.toThrow("Create failed");

    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it("should throw error if fetchThreads fails", async () => {
    const error = new Error("Fetch threads failed");

    mockedAxios.get.mockRejectedValue(error);

    await expect(fetchThreads("bot123")).rejects.toThrow(
      "Fetch threads failed"
    );

    expect(mockedAxios.get).toHaveBeenCalled();
  });

  it("should throw error if fetchUser fails", async () => {
    const error = new Error("Fetch user failed");

    mockedAxios.get.mockRejectedValue(error);

    await expect(fetchUser()).rejects.toThrow("Fetch user failed");
  });

  it("should throw error if isLoggedIn fails", async () => {
    const error = new Error("Not logged in");

    mockedAxios.get.mockRejectedValue(error);

    await expect(isLoggedIn()).rejects.toThrow("Not logged in");
  });
});
