import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  File as FileIcon,
  MoreVertical,
  Plus,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import styles from "./FileManager.module.css";
import axios from "axios";
import { API_BASE } from "./FileManager.logic";
import type { ThreadFile } from "./FileManager.logic";
import { useParams } from "react-router-dom";
import { useAlert } from "../../context/AlertContext";

interface FileManagerProps {
  threadId?: string;
}

const DeleteFileModal = ({
  isOpen,
  onCancel,
  onConfirm,
  fileName,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  fileName: string;
}) => {
  if (!isOpen) return null;
  return (
    <button className={styles.modalOverlay} onClick={onCancel}>
      <button
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Delete file?</h3>
          <button onClick={onCancel} className={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>
            Are you sure you want to delete{" "}
            <strong>"{fileName || "Untitled File"}"</strong>? This action cannot
            be undone.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmDeleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </button>
    </button>
  );
};

const FileManager: React.FC<FileManagerProps> = () => {
  const { showAlert } = useAlert();
  const mimeTypes: Record<string, string> = {
    txt: "text/plain",
    pdf: "application/pdf",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    json: "application/json",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
  };
  const { threadId } = useParams<{ threadId: string }>();
  const [files, setFiles] = useState<ThreadFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ThreadFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(
    async (silent: boolean = false) => {
      if (!threadId) return;
      if (!silent) setIsLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/bots/thread/${threadId}`);
        const fileData = response.data.files || [];
        console.log("Fetched files:", fileData);
        setFiles(fileData);
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [threadId],
  );

  useEffect(() => {
    fetchFiles();
  }, [threadId, fetchFiles]);

  // Handle automatic status updates for pending files
  useEffect(() => {
    let timeoutId: number;

    const hasPendingFiles = files.some(
      (file) =>
        file.status.toLowerCase() !== "completed" &&
        file.status.toLowerCase() !== "failed" &&
        file.status.toLowerCase() !== "error",
    );

    if (hasPendingFiles && threadId) {
      timeoutId = setTimeout(() => {
        fetchFiles(true);
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [files, threadId, fetchFiles]);

  const handlePlusClick = () => {
    if (!threadId) {
      showAlert("Please select or create a thread first.", { title: "Notice" });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      await handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    if (!threadId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_BASE}/bots/${threadId}/file`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("File uploaded successfully to thread:", threadId);
      await fetchFiles(); // Refresh list
    } catch (error) {
      console.error("Upload failed:", error);
      showAlert("Upload failed. Please try again.", { title: "Error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreview = async (file: ThreadFile) => {
    setActiveDropdownId(null);

    try {
      // Step 1: Get signed URL from your API
      const response = await axios.get(
        `${API_BASE}/bots/file/${file.id}/download`,
      );

      const fileUrl: string | undefined = response.data?.file_url;

      if (!fileUrl) {
        showAlert("Preview URL not found.", { title: "Error" });
        return;
      }
      console.log(fileUrl);

      const fileResponse = await fetch(fileUrl);
      const arrayBuffer = await fileResponse.arrayBuffer();
      const fileType = file.name.split(".").pop()?.toLowerCase() || "";

      // 🔥 Force correct MIME type
      const blob = new Blob([arrayBuffer], {
        type: mimeTypes[fileType],
      });
      console.log("Blob created with type:", blob);
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setPreviewFileName(file.name);
    } catch (err) {
      console.error("Preview error:", err);
      showAlert("Failed to load preview.", { title: "Error" });
    }
  };

  const handleDeleteClick = (file: ThreadFile) => {
    setActiveDropdownId(null);
    setFileToDelete(file);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      await axios.delete(`${API_BASE}/bots/file/${fileToDelete.id}`);
      await fetchFiles();
      setFileToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      showAlert("Failed to delete file.", { title: "Error" });
    }
  };

  if (previewUrl) {
    return (
      <div className={styles.fileManager}>
        <div className={styles.fmHeader}>
          <div className={styles.fmActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setPreviewUrl(null)}
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <h3>Preview: {previewFileName}</h3>
        </div>
        <div className={styles.previewContainer}>
          <iframe
            src={`${previewUrl}`}
            className={styles.previewFrame}
            title="Document Preview"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fileManager}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.csv,.txt,.xlsx,.json,.md,.mp3,.png,.jpg,.jpeg,.ogg,.wav"
      />
      <div className={styles.fmHeader}>
        <div className={styles.fmActions}>
          <button
            className={styles.iconBtn}
            onClick={() => fetchFiles(false)}
            disabled={isLoading || isUploading}
          >
            {isLoading ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
          <button
            className={`${styles.iconBtn} ${styles.primary}`}
            onClick={handlePlusClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <Plus size={16} />
            )}
          </button>
        </div>
      </div>

      <div className={styles.fileList}>
        {files.length === 0 && !isLoading && (
          <div className={styles.emptyFiles}>
            <p>No documents found.</p>
            <button className={styles.uploadBtn} onClick={handlePlusClick}>
              Upload Document
            </button>
          </div>
        )}
        {files.map((file, idx) => (
          <div key={file.id || idx} className={styles.fileItem}>
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>
                <FileIcon size={18} />
              </div>
              <div className={styles.fileDetails}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileStatus}>
                  <span
                    className={`${styles.statusDot} ${file.status.toLowerCase() === "completed" ? styles.processed : styles.pending}`}
                  />
                  {file.status}
                </span>
              </div>
            </div>
            <div className={styles.actionMenu}>
              <button
                className={styles.iconBtn}
                onClick={() =>
                  setActiveDropdownId(
                    activeDropdownId === file.id ? null : file.id,
                  )
                }
              >
                <MoreVertical size={16} />
              </button>
              {activeDropdownId === file.id && (
                <div className={styles.dropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => handlePreview(file)}
                  >
                    <Eye size={14} /> View Preview
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${styles.deleteItem}`}
                    onClick={() => handleDeleteClick(file)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <DeleteFileModal
        isOpen={!!fileToDelete}
        onCancel={() => setFileToDelete(null)}
        onConfirm={confirmDelete}
        fileName={fileToDelete?.name || ""}
      />
    </div>
  );
};

export default FileManager;
