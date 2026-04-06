import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FileManager from "../components/FileManager/FileManager";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as AlertContext from "../context/AlertContext";

// Mock axios
vi.mock("axios");

const mockShowAlert = vi.fn();

// Polyfill for Blob.arrayBuffer if not present in test environment
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Create a helper to render the component with a specific threadId
const renderFileManager = (threadId = "test-thread-id") => {
  return render(
    <MemoryRouter initialEntries={[`/thread/${threadId}`]}>
      <Routes>
        <Route path="/thread/:threadId" element={<FileManager />} />
        <Route path="/" element={<FileManager />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("FileManager Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    vi.spyOn(AlertContext, "useAlert").mockReturnValue({
      showAlert: mockShowAlert,
      showConfirm: vi.fn(),
    } as any);
  });

  it("renders empty state when no files exist", async () => {
    (axios.get as any).mockResolvedValue({ data: { files: [] } });

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByText("No documents found.")).toBeInTheDocument();
    });
  });

  it("fetches and displays files successfully", async () => {
    const mockFiles = [
      { id: "1", name: "test1.pdf", status: "completed" },
      { id: "2", name: "test2.docx", status: "pending" },
    ];
    (axios.get as any).mockResolvedValue({ data: { files: mockFiles } });

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByText("test1.pdf")).toBeInTheDocument();
      expect(screen.getByText("test2.docx")).toBeInTheDocument();
    });
  });

  it("triggers file upload when add button is clicked", async () => {
    (axios.get as any).mockResolvedValue({ data: { files: [] } });

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByLabelText("Add file")).toBeInTheDocument();
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("allows file upload and refreshes file list", async () => {
    (axios.get as any).mockResolvedValue({ data: { files: [] } });
    (axios.post as any).mockResolvedValue({ data: { success: true } });

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByLabelText("Add file")).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(["test data"], "test1.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledTimes(2); 
    });
  });

  it("handles preview success flow and renders iframe", async () => {
    const blob = new Blob(["test"], { type: "application/pdf" });
    const mockBlobUrl = "blob:mock-url";
    window.URL.createObjectURL = vi.fn().mockReturnValue(mockBlobUrl);

    const mockFiles = [{ id: "file1", name: "document.pdf", status: "completed" }];
    (axios.get as any)
      .mockResolvedValueOnce({ data: { files: mockFiles } }) 
      .mockResolvedValueOnce({ data: { file_url: "http://signed-url.com" } }) 
      .mockResolvedValueOnce({ data: blob }); 

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Actions for document.pdf/i));
    fireEvent.click(screen.getByText(/View Preview/i));

    await waitFor(() => {
      expect(screen.getByText(/Back/i)).toBeInTheDocument();
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain(mockBlobUrl);
    });
  });

  it("opens delete modal and deletes file", async () => {
    const mockFiles = [{ id: "file1", name: "document.pdf", status: "completed" }];
    (axios.get as any).mockResolvedValue({ data: { files: mockFiles } });
    (axios.delete as any).mockResolvedValue({ data: { success: true } });

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Actions for document.pdf/i));
    
    // Now pick Delete from the dropdown
    const deleteBtn = screen.getByText("Delete");
    fireEvent.click(deleteBtn);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText(/Delete file\?/i)).toBeInTheDocument();
    });

    // Find the confirm button specifically in the modal
    // We can use screen.getByRole("button", { name: "Delete" }) 
    // because the dropdown should have closed.
    const confirmBtn = await screen.findByRole("button", { name: /^Delete$/ });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("file1"));
    });
  });

  it("closes delete modal when cancel is clicked", async () => {
    const mockFiles = [{ id: "file1", name: "document.pdf", status: "completed" }];
    (axios.get as any).mockResolvedValue({ data: { files: mockFiles } });

    renderFileManager();

    await waitFor(() => {
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Actions for document.pdf/i }));
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByText(/Delete file\?/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Delete file\?/i)).not.toBeInTheDocument();
    });
  });

  it("shows notice when adding file without threadId", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<FileManager />} />
        </Routes>
      </MemoryRouter>
    );

    const addBtn = screen.getByLabelText("Add file");
    fireEvent.click(addBtn);

    expect(mockShowAlert).toHaveBeenCalledWith(
      "Please select or create a thread first.",
      expect.objectContaining({ title: "Notice" })
    );
  });
});
