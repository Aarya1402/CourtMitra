import React, { useState, useEffect, useRef } from "react";
import TranscriptEditor from "../../components/TranscriptEditor/TranscriptEditor";
import FileManager from "../../components/FileManager/FileManager";
import { User, MessageSquare, Plus, LogOut, Upload, Mic } from "lucide-react";
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

const normalizeOrderData = (data: any): OrderData => {
  if (!data) return initialOrderData;

  const normalized = {
    ...initialOrderData,
    ...data,
    header: { ...initialOrderData.header, ...data.header },
    operative_order: {
      ...initialOrderData.operative_order,
      ...(data.operative_order || {}),
    },
  };

  if (!Array.isArray(normalized.reasoning_points)) {
    normalized.reasoning_points =
      typeof normalized.reasoning_points === "string" &&
      normalized.reasoning_points.trim()
        ? [normalized.reasoning_points]
        : [];
  }

  if (!Array.isArray(normalized.operative_order.directions)) {
    normalized.operative_order.directions =
      typeof normalized.operative_order.directions === "string" &&
      normalized.operative_order.directions.trim()
        ? [normalized.operative_order.directions]
        : [];
  }

  return normalized;
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
  const [language, setLanguage] = useState("gu-IN"); // Defaulting to Gujarati as requested
  const [isActuallyRecording, setIsActuallyRecording] = useState(false);
  const [originalTranscriptBeforeModify, setOriginalTranscriptBeforeModify] =
    useState("");
  const userMenuRef = useRef<HTMLButtonElement>(null);
  console.log(isProcessing);

  const dispatch = useDispatch();
  const botId = useSelector((state: RootState) => state.bot.botId);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const name = await isLoggedIn();
        console.log("User:", name);
      } catch (error: any) {
        console.log("User is not logged in");
        console.log(error.response);

        // ✅ handle both cases
        if (
          !error.response ||
          error.response.status === 401 ||
          error.response.status === 403 ||
          error.response.status === 502
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

  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    console.log(file);
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
    } catch (error: any) {
      console.error("Upload transcription failed:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to transcribe uploaded file";
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
    } catch (error) {
      console.error("Logout error", error);
      navigate("/auth", { replace: true });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const percentage = (e.clientX / window.innerWidth) * 100;

      if (isDraggingLeft) {
        const newLeft = Math.max(20, Math.min(percentage, 80));
        setLeftWidth(newLeft);
        setRightWidth(100 - newLeft);
      } else if (isDraggingRight) {
        const newRight = Math.max(20, Math.min(100 - percentage, 80));
        setRightWidth(newRight);
        setLeftWidth(100 - newRight);
      }
      console.log(leftWidth, rightWidth);
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

  const messages = useSelector((state: RootState) =>
    state.chat.messages.filter((m) => m.threadId === threadId)
  );

  const filteredMessages = messages.filter(
    (m) =>
      !m.text.includes("You are an expert legal document parser") &&
      !m.text.includes("CURRENT EXTRACTED JSON:")
  );

  const loading = useSelector((state: RootState) => state.chat.loading);
  const scrollRef = useRef<HTMLDivElement>(null);

  const prevLengthRef = useRef(0);
  const scrollPositionRef = useRef(0);
  const isRestoringRef = useRef(false);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;

    // ✅ FIRST LOAD → always go to bottom
    if (isFirstLoadRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isFirstLoadRef.current = false;
      prevLengthRef.current = messages.length;
      return;
    }

    // 🚫 Skip when restoring (tab switch)
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      prevLengthRef.current = messages.length;
      return;
    }

    const lastMessage = messages[messages.length - 1];

    // ✅ Normal behavior (new messages)
    if (
      messages.length > prevLengthRef.current &&
      lastMessage.sender === "bot"
    ) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }

    prevLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (centerTab === "chat" && scrollRef.current) {
      isRestoringRef.current = true;

      // wait for DOM render
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPositionRef.current;
        }
      });
    }
  }, [centerTab]);

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

    loadThreadState(threadId).then((state) => {
      if (state) {
        setTranscript(state.transcript || "");
        setOrderData(normalizeOrderData(state.orderData));
        setAudioBlob(state.audioBlob || null);

        lastProcessedTranscriptRef.current = state.transcript || "";
      }
      setIsStateLoaded(true);
    });
  }, [threadId]); // ✅ ONLY threadId

  // Save persistent workspace state whenever it updates (after initial load)
  useEffect(() => {
    if (threadId && isStateLoaded) {
      saveThreadState(threadId, { transcript, orderData, audioBlob });
    }
  }, [transcript, orderData, audioBlob, threadId, isStateLoaded]);

  const extractDataFromChunk = async (fullTranscript: string) => {
    setIsExtracting(true);
    const currentJsonString = JSON.stringify(orderData);

    try {
      const data = {
        currentJsonString,
        chunk: fullTranscript,
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/gemini/extract`,
        data
      );

      let resultText =
        typeof response.data.result === "string"
          ? response.data.result
          : JSON.stringify(response.data.result);
      resultText = resultText
        .replaceAll(/```json/gi, "")
        .replaceAll(/```/g, "")
        .trim();

      const newJson = JSON.parse(resultText);
      const parsedObj = Array.isArray(newJson) ? newJson[0] : newJson;
      if (parsedObj && typeof parsedObj === "object") {
        if (parsedObj.header || parsedObj.case_title) {
          setOrderData(normalizeOrderData(parsedObj));
          setLeftTab("order");
        }
      }
    } catch (err) {
      console.error("Extraction error", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleModify = (start: number, end: number) => {
    setModificationRange({ start, end });
    setOriginalTranscriptBeforeModify(transcript);
    setShowRecorder(true);
  };

  const fetchThreadTitle = async () => {
    if (!threadId) return;

    try {
      const threadsRes = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/thread/${threadId}`
      );
      const threadTitle = threadsRes.data.title || "";
      setThreadTitle(threadTitle);
    } catch (e) {
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
    } catch (e) {
      console.error("Failed to update title:", e);
      setIsEditingTitle(false);
    }
  };

  const fetchChatHistory = async (pageNumber: number = 1) => {
    if (!threadId || isFetchingHistory) return;
    setIsFetchingHistory(true);
    try {
      const chatHistory = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/${threadId}/chat_history?page=${pageNumber}&per_page=30`
      );
      const history = chatHistory.data.history || [];

      if (history.length < 30) {
        setHasMore(false);
      }

      const formattedMessages = history.flatMap((item: any) => {
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
        // Prepend and Maintain scroll height
        const scrollContainer = scrollRef.current;
        const prevHeight = scrollContainer?.scrollHeight || 0;

        dispatch(
          prependMessagesForThread({
            threadId,
            messages: formattedMessages,
          })
        );

        // We use requestAnimationFrame to wait for the DOM render
        requestAnimationFrame(() => {
          if (scrollContainer) {
            const newHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = newHeight - prevHeight;
          }
        });
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    fetchThreadTitle();
  }, [threadId, botId]);

  const handleSend = async (text: string) => {
    dispatch(addUserMessage({ text, threadId }));
    dispatch(setLoading(true));
    try {
      // ✅ Fetch the LATEST files for this thread to ensure all uploaded docs are included
      const responseFile = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/file/${threadId}/status`
      );

      const allFiles = responseFile.data.files || [];
      const currentDocumentIds = allFiles.map((f: any) => f.file_id);

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

      // 🚀 STREAM CALL (NO AXIOS)
      const response = await fetch(
        `${API_BASE_URL}/api/talkument/bots/agui/interact/${threadId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        console.log("Received chunk:", chunk);

        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          try {
            const json = JSON.parse(line.replace("data:", "").trim());

            if (json.type === "TEXT_MESSAGE_CONTENT") {
              botText += json.delta;

              // ✅ update message progressively
              dispatch(
                updateBotMessage({
                  id: botMessageId,
                  text: botText,
                  threadId,
                })
              );
            }
          } catch (err) {
            console.log("parse error", err);
          }
        }
      }

      // ✅ optional: refresh history
      setTimeout(fetchChatHistory, 500);
    } catch (err) {
      console.error("Interact error:", err);
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

  return (
    <div
      className={styles.appContainer}
      style={{
        userSelect: isDraggingLeft || isDraggingRight ? "none" : "auto",
      }}
    >
      {/* ✅ GLOBAL HEADER */}
      <div className={styles.globalHeader}>
        {/* LEFT */}
        <div className={styles.headerLeftSection}>
          <div className={styles.logoSection} onClick={() => navigate("/")}>
            <img src="/logo.svg" alt="CourtMitra" className={styles.logoImg} />
            <span className={styles.logoText}>CourtMitra</span>
          </div>
        </div>

        {/* CENTER */}
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
            <h2
              className={styles.threadTitle}
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
            >
              {threadTitle || "Untitled Chat"}
            </h2>
          )}
        </div>

        {/* RIGHT */}
        <div className={styles.headerRightSection}>
          <button className={styles.newChatBtn} onClick={() => navigate("/")}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          <button
            className={styles.userProfile}
            onClick={() => setShowLogout(!showLogout)}
            ref={userMenuRef}
          >
            <User size={18} />
            {showLogout && (
              <div className={styles.logoutDropdown}>
                <button
                  className={styles.logoutBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <div className={styles.mainLayout}>
        {/* LEFT SIDE */}
        <div className={styles.divisionLeft} style={{ width: `${leftWidth}%` }}>
          <div className={styles.transcriptSection}>
            {/* Tabs */}
            <div className={styles.tabContainer}>
              <button
                className={
                  leftTab === "transcript" ? styles.activeTab : styles.tab
                }
                onClick={() => setLeftTab("transcript")}
              >
                Transcript
              </button>

              <button
                className={leftTab === "order" ? styles.activeTab : styles.tab}
                onClick={() => setLeftTab("order")}
              >
                Order
              </button>
            </div>

            {errorMessage && (
              <div className={styles.errorBanner}>
                {errorMessage}
                <button onClick={() => setErrorMessage(null)}>Dismiss</button>
              </div>
            )}

            <Activity mode={leftTab === "transcript" ? "visible" : "hidden"}>
              <>
                <TranscriptEditor
                  transcript={transcript}
                  onChange={setTranscript}
                  isLoading={isProcessing}
                  onModify={handleModify}
                  isRecording={isActuallyRecording}
                  language={language}
                />

                <div className={styles.recorderSection}>
                  <button
                    className={styles.generateOrderBtn}
                    onClick={() => extractDataFromChunk(transcript)}
                    disabled={isExtracting || !transcript || !transcript.trim()}
                  >
                    {isExtracting ? "Generating..." : "Generate Order"}
                  </button>

                  {!showRecorder && (
                    <>
                      <button
                        className={styles.startRecordingBtn}
                        onClick={() => setShowRecorder(true)}
                        title="Recorder"
                      >
                        <Mic size={16} />
                      </button>

                      <button
                        className={styles.uploadBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title={isUploading ? "Uploading..." : "Upload Audio"}
                      >
                        <Upload size={16} />
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAudioUpload}
                        accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
                        style={{ display: "none" }}
                      />

                      <select
                        className={styles.languageInline}
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        <option value="gu-IN">Gujarati</option>
                        <option value="en-IN">English</option>
                        <option value="hi-IN">Hindi</option>
                        <option value="ta-IN">Tamil</option>
                        <option value="te-IN">Telugu</option>
                        <option value="kn-IN">Kannada</option>
                        <option value="mr-IN">Marathi</option>
                        <option value="bn-IN">Bengali</option>
                        <option value="pa-IN">Punjabi</option>
                        <option value="od-IN">Odia</option>
                        {/* <option value="unknown">Auto-detect</option> */}
                      </select>
                    </>
                  )}

                  {showRecorder && (
                    <AudioRecorder
                      autoStart={true} // 🔥 ADD THIS
                      fileName={threadTitle}
                      transcript={transcript}
                      onTranscriptionStart={() => {
                        setIsProcessing(true);
                        setErrorMessage(null);
                      }}
                      onTranscriptionComplete={(text: string) => {
                        if (modificationRange) {
                          const { start, end } = modificationRange;
                          const before =
                            originalTranscriptBeforeModify.substring(0, start);
                          const after =
                            originalTranscriptBeforeModify.substring(end);
                          setTranscript(before + text + after);
                          setModificationRange(null);
                        } else {
                          setTranscript(text);
                        }
                        setIsProcessing(false);
                      }}
                      onRecordingStateChange={setIsActuallyRecording}
                      onTranscriptionError={(msg: string) => {
                        setErrorMessage(msg);
                        setIsProcessing(false);
                      }}
                      onAudioBlobComplete={(blob: Blob) => {
                        setAudioBlob(blob);
                      }}
                      resetTranscript={() => {
                        setTranscript("");
                        setAudioBlob(null);
                      }}
                      onClose={() => {
                        setShowRecorder(false);
                      }}
                      language={language}
                    />
                  )}
                </div>
              </>
            </Activity>

            <Activity mode={leftTab === "order" ? "visible" : "hidden"}>
              <OrderForm
                data={orderData}
                onUpdate={setOrderData}
                isProcessing={isExtracting}
                language={language}
              />
            </Activity>
          </div>
        </div>

        {/* Divider */}
        <button
          className={styles.resizeHandle}
          onMouseDown={() => setIsDraggingLeft(true)}
          data-resize-handle-state={isDraggingLeft ? "drag" : "idle"}
        />

        {/* CENTER */}
        <main className={styles.divisionCenter}>
          <div className={styles.tabContainer}>
            <button
              className={centerTab === "chat" ? styles.activeTab : styles.tab}
              onClick={() => setCenterTab("chat")}
            >
              Chat
            </button>
            <button
              className={centerTab === "files" ? styles.activeTab : styles.tab}
              onClick={() => {
                if (centerTab === "chat" && scrollRef.current) {
                  scrollPositionRef.current = scrollRef.current.scrollTop;
                }
                setCenterTab("files");
              }}
            >
              Files
            </button>
          </div>

          <div
            className={styles.centerWorkspace}
            ref={scrollRef}
            onScroll={handleScroll}
          >
            {centerTab === "chat" && (
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
                      <p>
                        Select a document or start a new conversation to begin.
                      </p>
                    </div>
                  ) : (
                    <ChatMessages
                      messages={filteredMessages}
                      loading={loading}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
                <ChatInput onSend={handleSend} disabled={loading} />
              </>
            )}

            {centerTab === "files" && <FileManager />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ThreadPage;
