import React, { useState, useEffect, useRef, useMemo } from "react";
import TranscriptEditor from "../../components/TranscriptEditor/TranscriptEditor";
import FileManager from "../../components/FileManager/FileManager";
import {
  User,
  MessageSquare,
  Plus,
  LogOut,
  Upload,
  Mic,
  Download,
} from "lucide-react";
import styles from "./ThreadPage.module.css";
import { useParams, useNavigate } from "react-router-dom";
import ChatMessages from "../../components/ChatMessages/ChatMessages";
import ChatInput from "../../components/ChatMessages/ChatInput";
import { useDispatch, useSelector } from "react-redux";
import {
  addUserMessage,
  addBotMessage,
  setLoading,
  setMessagesForThread,
  deleteMessage,
  updateBotMessage,
  prependMessagesForThread,
} from "../../store/chatSlice";
import { setLanguageForThread } from "../../store/botSlice";
import type { RootState } from "../../store";
import axios from "axios";
import { setDocumentIds } from "../../store/documentSlicer";
import OrderForm, {
  type OrderData,
} from "../../components/OrderForm/OrderForm";
import { saveThreadState, loadThreadState } from "../../utils/storageUtils";
import { API_BASE_URL } from "../../constants/api";
import { initialOrderData } from "../../components/OrderForm/OrderForm.logic";
import { useAlert } from "../../context/AlertContext";
import { updateThreadTitle } from "./ThreadPage.logic";
import AudioRecorder from "../../components/AudioRecorder/AudioRecorder";
import { isLoggedIn } from "../HomePage/HomePage.logic";

const Activity: React.FC<{
  children: React.ReactNode;
  mode: "visible" | "hidden";
}> = ({ children, mode }) => {
  return mode === "visible" ? <>{children}</> : null;
};

const normalizeOrderData = (data: Partial<OrderData> | null): OrderData => {
  if (!data) return initialOrderData;

  const normalized = {
    ...initialOrderData,
    ...data,
    header: { ...initialOrderData.header, ...data.header },
    operative_order: {
      ...initialOrderData.operative_order,
      ...data.operative_order,
    },
  };

  if (!Array.isArray(normalized.reasoning_points)) {
    normalized.reasoning_points =
      typeof normalized.reasoning_points === "string" &&
      (normalized.reasoning_points as string).trim()
        ? [(normalized.reasoning_points as string)]
        : [];
  }

  if (!Array.isArray(normalized.operative_order.directions)) {
    normalized.operative_order.directions =
      typeof normalized.operative_order.directions === "string" &&
      (normalized.operative_order.directions as string).trim()
        ? [(normalized.operative_order.directions as string)]
        : [];
  }

  return normalized;
};

const LANGUAGE_OPTIONS = [
  { value: "gu-IN", label: "Gujarati" },
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
] as const;

/** ✅ GLOBAL HEADER COMPONENT */
const GlobalHeader: React.FC<{
  threadTitle: string | null;
  isEditingTitle: boolean;
  setIsEditingTitle: (v: boolean) => void;
  setThreadTitle: (v: string) => void;
  handleTitleUpdate: (v: string) => void;
  showLogout: boolean;
  setShowLogout: (v: boolean) => void;
  handleLogout: () => void;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
}> = ({
  threadTitle,
  isEditingTitle,
  setIsEditingTitle,
  setThreadTitle,
  handleTitleUpdate,
  showLogout,
  setShowLogout,
  handleLogout,
  userMenuRef,
  navigate,
}) => (
  <div className={styles.globalHeader}>
    <div className={styles.headerLeftSection}>
      <button
        className={styles.logoSection}
        onClick={() => navigate("/")}
        type="button"
      >
        <img src="/logo.svg" alt="CourtMitra" className={styles.logoImg} />
        <span className={styles.logoText}>CourtMitra</span>
      </button>
    </div>
    <div className={styles.headerCenterSection}>
      {isEditingTitle ? (
        <input
          autoFocus
          className={styles.threadTitleInput}
          value={threadTitle || ""}
          onChange={(e) => setThreadTitle(e.target.value)}
          onBlur={() => setIsEditingTitle(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTitleUpdate(threadTitle || "");
              setIsEditingTitle(false);
            }
            if (e.key === "Escape") setIsEditingTitle(false);
          }}
        />
      ) : (
        <button
          className={styles.threadTitle}
          onClick={() => setIsEditingTitle(true)}
          title="Click to edit"
          type="button"
        >
          {threadTitle || "Untitled Chat"}
        </button>
      )}
    </div>
    <div className={styles.headerRightSection}>
      <button
        className={styles.newChatBtn}
        onClick={() => navigate("/")}
        type="button"
      >
        <Plus size={18} />
        <span>New Chat</span>
      </button>
      <div style={{ position: "relative" }} ref={userMenuRef as React.RefObject<HTMLDivElement>}>
        <button
          className={styles.userProfile}
          onClick={() => setShowLogout(!showLogout)}
          type="button"
          aria-label="User Profile"
        >
          <User size={18} />
        </button>
        {showLogout && (
          <div className={styles.logoutDropdown}>
            <button
              className={styles.logoutBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              type="button"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

/** ✅ MOBILE TABS COMPONENT */
const MobileTabs: React.FC<{
  mobileTab: string;
  onTabChange: (tab: "transcript" | "order" | "chat" | "files") => void;
}> = ({ mobileTab, onTabChange }) => (
  <div className={styles.mobileTabWrapper}>
    <div className={styles.tabContainer}>
      {(["transcript", "order", "chat", "files"] as const).map((tab) => (
        <button
          key={tab}
          className={mobileTab === tab ? styles.activeTab : styles.tab}
          onClick={() => onTabChange(tab)}
          data-testid={`mobile-tab-${tab}`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

/** ✅ TRANSCRIPT WORKSPACE COMPONENT */
const TranscriptWorkspace: React.FC<{
  transcript: string;
  setTranscript: (v: string) => void;
  isProcessing: boolean;
  isActuallyRecording: boolean;
  language: string;
  showRecorder: boolean;
  setShowRecorder: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  isMobile: boolean;
  saveAsMP3: () => void;
  audioURL: string;
  selectedLanguageLabel: string;
  showLanguageMenu: boolean;
  setShowLanguageMenu: (v: boolean) => void;
  handleLanguageChange: (v: string) => void;
  modificationRange: { start: number; end: number } | null;
  setModificationRange: (v: { start: number; end: number } | null) => void;
  originalTranscriptBeforeModify: string;
  setOriginalTranscriptBeforeModify: (v: string) => void;
  setIsProcessing: (v: boolean) => void;
  setErrorMessage: (v: string | null) => void;
  setIsActuallyRecording: (v: boolean) => void;
  setAudioBlob: (v: Blob | null) => void;
  setAudioURL: (v: string) => void;
  extractDataFromChunk: (v: string) => void;
  isExtracting: boolean;
}> = ({
  transcript,
  setTranscript,
  isProcessing,
  isActuallyRecording,
  language,
  showRecorder,
  setShowRecorder,
  fileInputRef,
  handleAudioUpload,
  isUploading,
  isMobile,
  saveAsMP3,
  audioURL,
  selectedLanguageLabel,
  showLanguageMenu,
  setShowLanguageMenu,
  handleLanguageChange,
  modificationRange,
  setModificationRange,
  originalTranscriptBeforeModify,
  setOriginalTranscriptBeforeModify,
  setIsProcessing,
  setErrorMessage,
  setIsActuallyRecording,
  setAudioBlob,
  setAudioURL,
  extractDataFromChunk,
  isExtracting,
}) => (
  <div className={styles.transcriptContainer}>
    <TranscriptEditor
      transcript={transcript}
      onChange={setTranscript}
      isLoading={isProcessing}
      isRecording={isActuallyRecording}
      language={language}
    />
    <div className={styles.recorderSection}>
      <div className={styles.recorderLeftGroup}>
        {!showRecorder && (
          <>
            <button
              className={styles.startRecordingBtn}
              onClick={() => setShowRecorder(true)}
              title="Recorder"
            >
              <Mic size={16} />
              <span>Mic</span>
            </button>
            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title={isUploading ? "Uploading..." : "Upload Audio"}
            >
              <Upload size={16} />
              <span>Upload</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAudioUpload}
              accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
              style={{ display: "none" }}
            />
            {isMobile && (
              <button
                className={`${styles.btn} ${styles.btnSave}`}
                onClick={saveAsMP3}
                disabled={!audioURL}
                title="Save As MP3"
              >
                <Download size={16} />
                <span>Save</span>
              </button>
            )}
            {isMobile ? (
              <>
                <button
                  type="button"
                  className={styles.languageInline}
                  onClick={() => setShowLanguageMenu(true)}
                >
                  {selectedLanguageLabel}
                </button>
                {showLanguageMenu && (
                  <>
                    <button
                      type="button"
                      className={styles.languageMenuBackdrop}
                      onClick={() => setShowLanguageMenu(false)}
                      aria-label="Close language menu"
                    />
                    <div className={styles.languageMenuSheet}>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`${styles.languageMenuItem} ${
                            option.value === language
                              ? styles.languageMenuItemActive
                              : ""
                          }`}
                          onClick={() => {
                            handleLanguageChange(option.value);
                            setShowLanguageMenu(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <select
                className={styles.languageInline}
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        {showRecorder && (
          <AudioRecorder
            autoStart={true}
            language={language}
            transcript={transcript}
            onTranscriptionStart={() => {
              if (!transcript) setIsProcessing(true);
              setErrorMessage(null);
            }}
            setShowRecorder={setShowRecorder}
            onTranscriptionComplete={(text: string) => {
              if (modificationRange) {
                const { start, end } = modificationRange;
                const before = originalTranscriptBeforeModify.substring(
                  0,
                  start
                );
                const after = originalTranscriptBeforeModify.substring(end);
                setTranscript(before + text + after);
                setModificationRange(null);
                setOriginalTranscriptBeforeModify(before + text + after);
              } else {
                setTranscript(transcript + text);
              }
              setIsProcessing(false);
            }}
            onRecordingStateChange={setIsActuallyRecording}
            onTranscriptionError={(msg: string) => {
              setErrorMessage(msg);
              setIsProcessing(false);
            }}
            onAudioBlobComplete={(blob: Blob) => setAudioBlob(blob)}
            setAudioURL={setAudioURL}
          />
        )}
        {!isMobile && (
          <button
            className={`${styles.btn} ${styles.btnSave}`}
            onClick={saveAsMP3}
            disabled={!audioURL}
            title="Save As MP3"
          >
            <Download size={16} />
            <span>Save</span>
          </button>
        )}
      </div>
      <button
        className={styles.generateOrderBtn}
        onClick={() => extractDataFromChunk(transcript)}
        disabled={isExtracting || !transcript?.trim()}
        data-testid="generate-order-btn"
      >
        {isExtracting ? "Generating..." : "Generate Order"}
      </button>
    </div>
  </div>
);

/** ✅ CHAT WORKSPACE COMPONENT */
const ChatWorkspace: React.FC<{
  isFetchingHistory: boolean;
  filteredMessages: { id: string; text: string; sender: "bot" | "user"; _id?: string; options?: string[]; attachments?: unknown[] }[];
  handleDelete: (id: string) => void;
  handleSend: (text: string) => void;
  loading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}> = ({
  isFetchingHistory,
  filteredMessages,
  handleDelete,
  handleSend,
  loading,
  bottomRef,
}) => (
  <>
    {isFetchingHistory && (
      <div className={styles.topLoader}>
        <div className={styles.spinner}></div>
        <span>Loading previous messages...</span>
      </div>
    )}
    <div className={styles.contentArea}>
      {filteredMessages.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.iconCircle}>
            <MessageSquare size={32} />
          </div>
          <h2>Universal Workspace</h2>
          <p>Select a document or start a new conversation to begin.</p>
        </div>
      ) : (
        <>
          <ChatMessages messages={filteredMessages} onDelete={handleDelete} />
          <div ref={bottomRef} />
        </>
      )}
    </div>
    <ChatInput onSend={handleSend} disabled={loading} />
  </>
);

/** ✅ DIVISION LEFT COMPONENT */
const DivisionLeft: React.FC<{
  isMobile: boolean;
  mobileTab: string;
  leftTab: string;
  setLeftTab: (v: "transcript" | "order") => void;
  leftWidth: number;
  errorMessage: string | null;
  setErrorMessage: (v: string | null) => void;
  transcriptWorkspaceProps: React.ComponentProps<typeof TranscriptWorkspace>;
  orderFormProps: React.ComponentProps<typeof OrderForm>;
}> = ({
  isMobile,
  mobileTab,
  leftTab,
  setLeftTab,
  leftWidth,
  errorMessage,
  setErrorMessage,
  transcriptWorkspaceProps,
  orderFormProps,
}) => {
  const isVisible = isMobile
    ? mobileTab === "transcript" || mobileTab === "order"
    : true;

  const isTranscriptActive = isMobile
    ? mobileTab === "transcript"
    : leftTab === "transcript";
  const isOrderActive = isMobile ? mobileTab === "order" : leftTab === "order";

  if (!isVisible) return null;

  return (
    <div
      className={styles.divisionLeft}
      style={isMobile ? { width: "100%" } : { width: `${leftWidth}%` }}
      data-testid="division-left"
    >
      <div className={styles.transcriptSection}>
        {!isMobile && (
          <div className={styles.tabContainer}>
            <button
              className={
                leftTab === "transcript" ? styles.activeTab : styles.tab
              }
              onClick={() => setLeftTab("transcript")}
              type="button"
            >
              Transcript
            </button>
            <button
              className={leftTab === "order" ? styles.activeTab : styles.tab}
              onClick={() => setLeftTab("order")}
              type="button"
            >
              Order
            </button>
          </div>
        )}

        {errorMessage && (
          <div className={styles.errorBanner}>
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} type="button">
              Dismiss
            </button>
          </div>
        )}

        <Activity mode={isTranscriptActive ? "visible" : "hidden"}>
          <TranscriptWorkspace {...transcriptWorkspaceProps} />
        </Activity>

        <Activity mode={isOrderActive ? "visible" : "hidden"}>
          <OrderForm {...orderFormProps} />
        </Activity>
      </div>
    </div>
  );
};

/** ✅ DIVISION CENTER COMPONENT */
const DivisionCenter: React.FC<{
  isMobile: boolean;
  mobileTab: string;
  centerTab: string;
  setCenterTab: (v: "chat" | "files") => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  chatWorkspaceProps: React.ComponentProps<typeof ChatWorkspace>;
}> = ({
  isMobile,
  mobileTab,
  centerTab,
  setCenterTab,
  scrollRef,
  handleScroll,
  chatWorkspaceProps,
}) => {
  const isVisible = isMobile
    ? mobileTab === "chat" || mobileTab === "files"
    : true;

  const isChatTabActive = isMobile
    ? mobileTab === "chat"
    : centerTab === "chat";
  const isFilesTabActive = isMobile
    ? mobileTab === "files"
    : centerTab === "files";

  if (!isVisible) return null;

  return (
    <main
      className={styles.divisionCenter}
      style={isMobile ? { width: "100%" } : {}}
      data-testid="division-center"
    >
      {!isMobile && (
        <div className={styles.tabContainer}>
          <button
            className={centerTab === "chat" ? styles.activeTab : styles.tab}
            onClick={() => setCenterTab("chat")}
            type="button"
          >
            Chat
          </button>
          <button
            className={centerTab === "files" ? styles.activeTab : styles.tab}
            onClick={() => setCenterTab("files")}
            type="button"
          >
            Files
          </button>
        </div>
      )}

      <div
        className={styles.centerWorkspace}
        ref={scrollRef}
        onScroll={handleScroll}
        data-testid="center-workspace"
      >
        {isChatTabActive && <ChatWorkspace {...chatWorkspaceProps} />}

        {isFilesTabActive && <FileManager />}
      </div>
    </main>
  );
};

const ThreadPage: React.FC = () => {
  const { showAlert } = useAlert();
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState("");
  const [showRecorder, setShowRecorder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [leftTab, setLeftTab] = useState<"transcript" | "order">("transcript");
  const [centerTab, setCenterTab] = useState<"chat" | "files">("chat");
  const [orderData, setOrderData] = useState<OrderData>(initialOrderData);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const lastProcessedTranscriptRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modificationRange, setModificationRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const dispatch = useDispatch();

  const language = useSelector(
    (state: RootState) => state.bot.languageByThread[threadId!]
  );

  useEffect(() => {
    if (!threadId) return;

    if (!language) {
      const storedLang = localStorage.getItem(threadId);

      const finalLang = storedLang || "gu-IN";

      dispatch(
        setLanguageForThread({
          threadId,
          language: finalLang,
        })
      );
    }
  }, [threadId, language, dispatch]);
  const [isActuallyRecording, setIsActuallyRecording] = useState(false);
  const [originalTranscriptBeforeModify, setOriginalTranscriptBeforeModify] =
    useState("");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const userMenuRef = useRef<HTMLButtonElement>(null);
  const botId = useSelector((state: RootState) => state.bot.botId);
  const [audioURL, setAudioURL] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoadingHistoryRef = useRef(false); // tracks history fetches without re-render

  const handleLanguageChange = async (newLang: string) => {
    dispatch(setLanguageForThread({ threadId: threadId!, language: newLang }));

    // Only set language in order section if form has non-initial data
    const isFormEmpty =
      JSON.stringify(orderData) === JSON.stringify(initialOrderData);

    if (!isFormEmpty) {
      setIsExtracting(true);
      try {
        const langLabel =
          LANGUAGE_OPTIONS.find((opt) => opt.value === newLang)?.label ||
          newLang;
        const res = await axios.post(`${API_BASE_URL}/api/order/translate`, {
          orderData,
          language: langLabel,
        });

        if (res.data.result) {
          setOrderData(normalizeOrderData(res.data.result));
        }
      } catch (error) {
        console.error("Failed to translate form data:", error);
        showAlert("Failed to translate form data. Labels updated only.");
      } finally {
        setIsExtracting(false);
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await isLoggedIn();
      } catch (error: unknown) {
        if (
          axios.isAxiosError(error) &&
          (!error.response ||
            error.response.status === 401 ||
            error.response.status === 403 ||
            error.response.status === 502)
        ) {
          navigate("/auth", { replace: true });
        }
      }
    };

    checkAuth();
  }, [navigate]);

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

  const [leftWidth, setLeftWidth] = useState(70);
  const [rightWidth, setRightWidth] = useState(30);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [mobileTab, setMobileTab] = useState<
    "transcript" | "order" | "chat" | "files"
  >("transcript");
  const [isMobile, setIsMobile] = useState(globalThis.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(globalThis.innerWidth <= 768);
    };
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowLanguageMenu(false);
    }
  }, [isMobile]);

  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const validTypes = [
      "audio/mpeg",
      "audio/ogg",
      "application/ogg",
      "audio/wav",
      "audio/x-wav",
    ];

    const validExtensions = [".mp3", ".ogg", ".wav"];

    const isValidType = validTypes.includes(file.type);
    const isValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValidType && !isValidExt) {
      showAlert("Only MP3, OGG, and WAV files are allowed");
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);
    setErrorMessage(null);

    setAudioBlob(file); // reuse your existing state

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const response = await axios.post("/api/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.transcript) {
        setTranscript(response.data.transcript);
      }
    } catch (error: unknown) {
      console.error("Upload transcription failed:", error);
      const errorMsg =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Failed to transcribe uploaded file";
      setErrorMessage(errorMsg);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/talkument/auth/logout`);
      navigate("/auth", { replace: true });
    } catch (error: unknown) {
      console.error("Logout error", error);
      navigate("/auth", { replace: true });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const percentage = (e.clientX / globalThis.innerWidth) * 100;

      if (isDraggingLeft) {
        const newLeft = Math.max(20, Math.min(percentage, 80));
        setLeftWidth(newLeft);
        setRightWidth(100 - newLeft);
      } else if (isDraggingRight) {
        const newRight = Math.max(20, Math.min(100 - percentage, 80));
        setRightWidth(newRight);
        setLeftWidth(100 - newRight);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight, leftWidth, rightWidth]);

  const allMessages = useSelector((state: RootState) => state.chat.messages);

  const filteredMessages = useMemo(
    () =>
      allMessages
        .filter((m) => m.threadId === threadId)
        .filter(
          (m) =>
            !m.text.includes("You are an expert legal document parser") &&
            !m.text.includes("CURRENT EXTRACTED JSON:")
        ),
    [allMessages, threadId]
  );

  const loading = useSelector((state: RootState) => state.chat.loading);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current || !hasMore || isFetchingHistory) return;

    if (scrollRef.current.scrollTop === 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchChatHistory(nextPage);
    }
  };

  // Load persistent workspace state on mount
  useEffect(() => {
    if (!threadId) return;

    loadThreadState(threadId).then((rawState) => {
      const state = rawState as { transcript?: string; orderData?: Partial<OrderData>; audioBlob?: Blob; language?: string } | null;
      if (state) {
        setTranscript(state.transcript || "");
        setOrderData(normalizeOrderData(state.orderData || null));
        setAudioBlob(state.audioBlob || null);
        if (state.language) {
          dispatch(
            setLanguageForThread({
              threadId: threadId!,
              language: state.language,
            })
          );
        }

        lastProcessedTranscriptRef.current = state.transcript || "";
      }
      setIsStateLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]); 

  // Save persistent workspace state whenever it updates (after initial load)
  useEffect(() => {
    if (threadId && isStateLoaded) {
      saveThreadState(threadId, {
        transcript,
        orderData,
        audioBlob,
        language,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, orderData, audioBlob, threadId, isStateLoaded]);

  const extractDataFromChunk = async (fullTranscript: string) => {
    setIsExtracting(true);

    const selectedLanguageLabel =
      LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ||
      "English";

    try {
      const data = {
        chunk: fullTranscript,
        language: selectedLanguageLabel,
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/order/extract`,
        data
      );

      let resultText =
        typeof response.data.result === "string"
          ? response.data.result
          : JSON.stringify(response.data.result);
      resultText = resultText
        .replaceAll(/```json/gi, "")
        .replaceAll("```", "")
        .trim();

      const newJson = JSON.parse(resultText);
      const parsedObj = Array.isArray(newJson) ? newJson[0] : newJson;
      if (parsedObj && typeof parsedObj === "object") {
        if (parsedObj.header || parsedObj.case_title) {
          setOrderData(normalizeOrderData(parsedObj));
          setLeftTab("order");
          setMobileTab("order");
        }
      }
    } catch (err: unknown) {
      console.error("Extraction error", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const saveAsMP3 = async () => {
    if (!audioURL) return;

    const response = await axios.get(audioURL, { responseType: "blob" });
    const blob = response.data;
    const arrayBuffer = await blob.arrayBuffer();

    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const samples = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const _global = globalThis as unknown as { lamejs: { Mp3Encoder: new (c: number, s: number, b: number) => { encodeBuffer: (d: Int16Array) => Int8Array; flush: () => Int8Array } } };
    const mp3encoder = new _global.lamejs.Mp3Encoder(
      1,
      sampleRate,
      128
    );

    const sampleBlockSize = 1152;
    const mp3Data = [];

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(
        Int16Array.from(sampleChunk.map((n) => n * 32767))
      );
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    const mp3Blob = new Blob(mp3Data as unknown as BlobPart[], {
      type: "audio/mp3",
    });

    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${threadTitle || "recording"}.mp3`;
    a.click();
  };

  const fetchThreadTitle = async () => {
    if (!threadId) return;

    try {
      const threadsRes = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/thread/${threadId}`
      );
      const threadTitle = threadsRes.data.title || "";
      setThreadTitle(threadTitle);
    } catch (e: unknown) {
      console.error("Failed to fetch thread title:", e);
    }
  };

  const handleTitleUpdate = async (newTitle: string) => {
    if (!threadId || !newTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setThreadTitle(newTitle);
      await updateThreadTitle(threadId, newTitle);
    } catch (e: unknown) {
      console.error("Failed to update title:", e);
      setIsEditingTitle(false);
    }
  };

  const fetchChatHistory = async (pageNumber: number = 1) => {
    if (!threadId || isFetchingHistory) return;
    isLoadingHistoryRef.current = true;
    setIsFetchingHistory(true);
    try {
      const chatHistory = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/${threadId}/chat_history?page=${pageNumber}&per_page=30`
      );
      const history = chatHistory.data.history || [];

      if (history.length < 30) {
        setHasMore(false);
      }

      interface HistoryItem {
        user?: string;
        assistant?: string;
        chat_id?: number | string;
        id?: number | string;
        message_id?: number | string;
        assistant_chat_id?: number | string;
      }

      const formattedMessages = history.flatMap((item: HistoryItem) => {
        const arr: {
          id?: string;
          text: string;
          sender: "user" | "bot";
          threadId: string | undefined;
        }[] = [];

        if (item.user) {
          arr.push({
            id: (item.chat_id || item.id || item.message_id)?.toString(),
            text: item.user,
            sender: "user",
            threadId,
          });
        }

        if (item.assistant) {
          arr.push({
            id: (
              item.assistant_chat_id ||
              item.chat_id ||
              item.id ||
              item.message_id
            )?.toString(),
            text: item.assistant,
            sender: "bot",
            threadId,
          });
        }

        return arr;
      });

      if (pageNumber === 1) {
        dispatch(
          setMessagesForThread({
            threadId,
            messages: formattedMessages,
          })
        );
      } else {
        dispatch(
          prependMessagesForThread({
            threadId,
            messages: formattedMessages,
          })
        );

        // We use requestAnimationFrame to wait for the DOM render
      }
    } catch (err: unknown) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      isLoadingHistoryRef.current = false;
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    fetchThreadTitle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, botId]);

  const prevMessageCountRef = useRef(0);
  const prevLastMessageTextRef = useRef("");

  useEffect(() => {
    if (isLoadingHistoryRef.current) return;

    const count = filteredMessages.length;
    const lastMsg = filteredMessages[count - 1];
    const lastText = lastMsg?.text ?? "";

    const isNewMessage = count > prevMessageCountRef.current;
    const isStreaming =
      count === prevMessageCountRef.current &&
      lastMsg?.sender === "bot" &&
      lastText !== prevLastMessageTextRef.current;

    if (isNewMessage || isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevMessageCountRef.current = count;
    prevLastMessageTextRef.current = lastText;
  }, [filteredMessages]);

  const handleSend = async (text: string) => {
    dispatch(addUserMessage({ text, threadId }));
    dispatch(setLoading(true));
    try {
      // ✅ Fetch the LATEST files for this thread to ensure all uploaded docs are included
      const responseFile = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/file/${threadId}/status`
      );

      const allFiles = responseFile.data.files || [];
      const currentDocumentIds = allFiles.map((f: { file_id: string }) => f.file_id);

      // ✅ update in Redux so UI stays in sync
      if (currentDocumentIds.length > 0) {
        dispatch(
          setDocumentIds({
            threadId: threadId!,
            documentIds: currentDocumentIds,
          })
        );
      }

      const data = {
        prompt: text,
        documents: currentDocumentIds,
        model: "gpt-4o-mini",
        agentic: false,
      };

      let botText = "";
      const botMessageId = Date.now().toString();

      dispatch(
        addBotMessage({
          id: botMessageId,
          text: "",
          threadId,
        })
      );

      // 🚀 STREAM CALL (AXIOS)
      let buffer = "";
      let lastPosition = 0;

      await axios.post(
        `${API_BASE_URL}/api/talkument/bots/agui/interact/${threadId}`,
        data,
        {
          withCredentials: true,
          onDownloadProgress: (progressEvent) => {
            const xhr = progressEvent.event.target as XMLHttpRequest;
            const raw = xhr.responseText;
            const chunk = raw.substring(lastPosition);
            lastPosition = raw.length;

            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;

              try {
                const json = JSON.parse(line.replace("data:", "").trim());

                if (json.type === "TEXT_MESSAGE_CONTENT") {
                  botText += json.delta;

                  dispatch(
                    updateBotMessage({
                      id: botMessageId,
                      text: botText,
                      threadId,
                    })
                  );
                }
              } catch (err: unknown) {
                console.error(err);
              }
            }
          },
        }
      );

      // ✅ optional: refresh history
      setTimeout(fetchChatHistory, 500);
    } catch (error: unknown) {
      console.error("Chat Error:", error);
      dispatch(
        addBotMessage({
          text: "Error getting response",
          threadId,
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/talkument/bots/chat/${messageId}/delete`
      );
      dispatch(deleteMessage(messageId));
    } catch (err) {
      console.error("Delete error:", err);
      // Maybe show a toast or alert
    }
  };

  const selectedLanguageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ||
    "Select Language";

  return (
    <div
      className={styles.appContainer}
      style={{
        userSelect: isDraggingLeft || isDraggingRight ? "none" : "auto",
      }}
    >
      <GlobalHeader
        threadTitle={threadTitle}
        isEditingTitle={isEditingTitle}
        setIsEditingTitle={setIsEditingTitle}
        setThreadTitle={setThreadTitle}
        handleTitleUpdate={handleTitleUpdate}
        showLogout={showLogout}
        setShowLogout={setShowLogout}
        handleLogout={handleLogout}
        userMenuRef={userMenuRef as unknown as React.RefObject<HTMLDivElement>}
        navigate={navigate}
      />

      {isMobile && (
        <MobileTabs mobileTab={mobileTab} onTabChange={setMobileTab} />
      )}

      <div className={styles.mainLayout}>
        <DivisionLeft
          isMobile={isMobile}
          mobileTab={mobileTab}
          leftTab={leftTab}
          setLeftTab={setLeftTab}
          leftWidth={leftWidth}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          orderFormProps={{
            data: orderData,
            onUpdate: setOrderData,
            isProcessing: isExtracting,
            language: language,
            onLanguageChange: handleLanguageChange,
            isMobile: isMobile,
          }}
          transcriptWorkspaceProps={{
            transcript,
            setTranscript,
            isProcessing,
            isActuallyRecording,
            language,
            showRecorder,
            setShowRecorder,
            fileInputRef,
            handleAudioUpload,
            isUploading,
            isMobile,
            saveAsMP3,
            audioURL,
            selectedLanguageLabel,
            showLanguageMenu,
            setShowLanguageMenu,
            handleLanguageChange,
            modificationRange,
            setModificationRange,
            originalTranscriptBeforeModify,
            setOriginalTranscriptBeforeModify,
            setIsProcessing,
            setErrorMessage,
            setIsActuallyRecording,
            setAudioBlob,
            setAudioURL,
            extractDataFromChunk,
            isExtracting,
          }}
        />

        {!isMobile && (
          <button
            className={styles.resizeHandle}
            onMouseDown={() => setIsDraggingLeft(true)}
            data-resize-handle-state={isDraggingLeft ? "drag" : "idle"}
            data-testid="resize-handle"
          />
        )}

        <DivisionCenter
          isMobile={isMobile}
          mobileTab={mobileTab}
          centerTab={centerTab}
          setCenterTab={setCenterTab}
          scrollRef={scrollRef}
          handleScroll={handleScroll}
          chatWorkspaceProps={{
            isFetchingHistory,
            filteredMessages,
            handleDelete,
            handleSend,
            loading,
            bottomRef,
          }}
        />
      </div>
    </div>
  );
};

export default ThreadPage;
