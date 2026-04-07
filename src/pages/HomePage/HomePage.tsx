import React, { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Trash2, X, LogOut, Plus, Menu } from "lucide-react";
import styles from "./HomePage.module.css";
import axios from "axios";
import { checkAndCreateBot } from "../../utils/botAuthUtils";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { Link, useNavigate } from "react-router";
import {
  fetchThreads,
  fetchUser,
  uploadDocument,
  deleteThread,
  createEmptyThread,
} from "./HomePage.logic";
import { API_BASE_URL } from "../../constants/api";
import { useAlert } from "../../context/AlertContext";
import gsap from "gsap";

const DeleteThreadModal = ({
  isOpen,
  onCancel,
  onConfirm,
  threadTitle,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  threadTitle: string;
}) => {
  const modalRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <button className={styles.modalOverlay} onClick={onCancel}>
      <button
        ref={modalRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Delete thread?</h3>
          <button onClick={onCancel} className={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>
            Are you sure you want to delete{" "}
            <strong>"{threadTitle || "Untitled Chat"}"</strong>? This action
            cannot be undone.
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

const HomePage: React.FC = () => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const newChatBtnRef = useRef<HTMLButtonElement>(null);
  const threadsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const botId = useSelector((state: RootState) => state.bot.botId);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<
    { thread_uuid: string; title: string }[]
  >([]);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    organisation: string;
    admin: boolean;
  } | null>(null);

  const [threadToDelete, setThreadToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [showLogout, setShowLogout] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowLogout(false);
      }
    };

    if (showLogout) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLogout]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/talkument/auth/logout`);
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Logout error", error);
      navigate("/auth", { replace: true });
    }
  };

  useEffect(() => {
    checkAndCreateBot();
    async function getThreads() {
      try {
        if (botId) {
          const threads = await fetchThreads(botId);
          setThreads(threads);
        }
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
            navigate("/auth", { replace: true });
          }
        }
      }
    }
    getThreads();
    async function getUser() {
      try {
        const user = await fetchUser();
        if (!user) {
          navigate("/auth", { replace: true });
          return;
        }
        setUser(user);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
            navigate("/auth", { replace: true });
          }
        }
      }
    }
    getUser();
  }, [botId, navigate]);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      sidebarRef.current,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
    )
      .fromTo(
        logoRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" },
        "-=0.3"
      )
      .fromTo(
        newChatBtnRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      )
      .fromTo(
        threadsRef.current?.children || [],
        { x: -20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
        },
        "-=0.2"
      )
      .fromTo(
        mainContentRef.current?.children || [],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        },
        "-=0.4"
      );
  }, []);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    if (!botId) {
      showAlert("Bot not initialized. Please wait or refresh.", {
        title: "Notice",
      });
      return;
    }

    setIsUploading(true);
    try {
      const newThreadId = await uploadDocument(file, botId);
      setThreadId(newThreadId);
    } catch (error) {
      showAlert("Upload failed. Please try again.", { title: "Error" });
      console.error("Upload failed in HomePage:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGetStarted = () => {
    if (threadId) {
      navigate(`/threads/${threadId}`);
    } else if (selectedFile && isUploading) {
      showAlert("Still uploading, please wait...", { title: "Notice" });
    } else {
      showAlert("Please upload a document first.", { title: "Notice" });
    }
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    id: string,
    title: string
  ) => {
    e.stopPropagation();
    setThreadToDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!threadToDelete) return;
    try {
      await deleteThread(threadToDelete.id);
      setThreads((prev) =>
        prev.filter((t) => t.thread_uuid !== threadToDelete.id)
      );
      setThreadToDelete(null);
    } catch (error) {
      console.error(error);
      showAlert("Failed to delete thread.", { title: "Error" });
    }
  };

  const handleCreateNewChat = async () => {
    if (!botId) {
      showAlert("Bot not initialized. Please wait or refresh.", {
        title: "Notice",
      });
      return;
    }

    setIsCreatingChat(true);
    try {
      const newThreadId = await createEmptyThread(botId);
      navigate(`/threads/${newThreadId}`);
    } catch (error) {
      console.error(error);
      showAlert("Failed to create new chat. Please try again.", {
        title: "Error",
      });
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <div className={styles.homeContainer}>
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <button className={styles.mobileLogo} onClick={() => navigate("/")}>
          <img src="/logo.svg" alt="CourtMitra" className={styles.logoImg} />
          <span className={styles.logoText}>CourtMitra</span>
        </button>
        <button
          className={styles.menuBtn}
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.csv,.txt,.xlsx,.json,.md"
      />
      {/* Sidebar */}
      {/* Sidebar Overlay */}
      <button
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.sidebarOverlayVisible : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
        ref={sidebarRef}
      >
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarHeader}>
            <button
              className={styles.logoSection}
              onClick={() => navigate("/")}
              style={{ cursor: "pointer" }}
              ref={logoRef}
            >
              <img
                src="/logo.svg"
                alt="CourtMitra"
                className={styles.logoImg}
              />
              <span className={styles.logoText}>CourtMitra</span>
            </button>
            <button
              className={styles.closeSidebarBtn}
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <button
            className={styles.newChatBtn}
            onClick={() => {
              handleCreateNewChat();
              setIsSidebarOpen(false);
            }}
            disabled={isCreatingChat}
            ref={newChatBtnRef}
          >
            {isCreatingChat ? (
              <Loader2 size={18} className={styles.spin} />
            ) : (
              <Plus size={18} />
            )}
            <span>New Chat</span>
          </button>

          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>Your chats</h3>
            <div className={styles.navList} ref={threadsRef}>
              {threads.map((thread: { thread_uuid: string; title: string }) => (
                <div
                  key={thread.thread_uuid}
                  className={styles.navItemContainer}
                >
                  <Link
                    to={`/threads/${thread.thread_uuid}`}
                    className={styles.navItem}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    {thread.title || "Untitled Chat"}
                  </Link>

                  <button
                    className={styles.deleteBtn}
                    onClick={(e) =>
                      handleDeleteClick(e, thread.thread_uuid, thread.title)
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.userProfile} ref={userMenuRef}>
            {/* ✅ Trigger button (real button, no role hack) */}
            <button
              type="button"
              className={styles.profileTrigger}
              onClick={() => setShowLogout(!showLogout)}
            >
              <div className={styles.avatar}>
                {user?.name.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name || "User"}</span>
                <span className={styles.userEmail}>
                  {user?.email || "user@example.com"}
                </span>
              </div>
            </button>

            {/* ✅ Dropdown OUTSIDE button */}
            {showLogout && (
              <div className={styles.logoutDropdown}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent} ref={mainContentRef}>
        <h1 className={styles.welcomeTitle}>
          Hey, Let's talk to your case papers...
        </h1>

        <button
          className={`${styles.uploadCard} ${selectedFile ? styles.hasFile : ""}`}
          onClick={handleFileClick}
        >
          {isUploading ? (
            <Loader2
              className={`${styles.uploadIcon} ${styles.spin}`}
              size={40}
            />
          ) : (
            <Upload className={styles.uploadIcon} size={40} />
          )}
          <span className={styles.uploadText}>
            {isUploading && "Uploading and processing..."}
            {!isUploading && selectedFile
              ? `File: ${selectedFile.name}`
              : "Upload your documents to get started..."}
          </span>
        </button>

        <button
          className={styles.getStartedBtn}
          onClick={handleGetStarted}
          disabled={isUploading || !threadId}
        >
          {(isUploading && "Processing...") ||
            (!isUploading && threadId
              ? "Get Started"
              : "Waiting for Upload...")}
        </button>

        {!threadId && !isUploading && (
          <button className={styles.skipBtn} onClick={handleCreateNewChat}>
            Or start a fresh chat without documents
          </button>
        )}
      </main>

      <DeleteThreadModal
        isOpen={!!threadToDelete}
        onCancel={() => setThreadToDelete(null)}
        onConfirm={confirmDelete}
        threadTitle={threadToDelete?.title || ""}
      />
    </div>
  );
};

export default HomePage;
