import React, { useState, useEffect, useRef } from "react";
import TranscriptEditor from "../../components/TranscriptEditor/TranscriptEditor";
import FileManager from "../../components/FileManager/FileManager";
import { User, MessageSquare, Plus, LogOut, FileText } from "lucide-react";
import styles from "./ThreadPage.module.css";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import FloatingRecorder from "../../components/AudioRecorder/FloatingRecorder";
import { initialOrderData } from "../../components/OrderForm/OrderForm.logic";
import { useAlert } from "../../context/AlertContext";

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
  const lastProcessedTranscriptRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modificationRange, setModificationRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isActuallyRecording, setIsActuallyRecording] = useState(false);
  const [originalTranscriptBeforeModify, setOriginalTranscriptBeforeModify] =
    useState("");

  const dispatch = useDispatch();
  const botId = useSelector((state: RootState) => state.bot.botId);

  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      showAlert("Please upload a valid audio file.", { title: "Invalid File" });
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
      if (isDraggingLeft) {
        setLeftWidth(
          Math.max(
            200,
            Math.min(e.clientX, window.innerWidth - rightWidth - 300),
          ),
        );
      } else if (isDraggingRight) {
        setRightWidth(
          Math.max(
            200,
            Math.min(
              window.innerWidth - e.clientX,
              window.innerWidth - leftWidth - 300,
            ),
          ),
        );
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

  const messages = useSelector((state: RootState) =>
    state.chat.messages.filter((m) => m.threadId === threadId),
  );

  const filteredMessages = messages.filter(
    (m) =>
      !m.text.includes("You are an expert legal document parser") &&
      !m.text.includes("CURRENT EXTRACTED JSON:"),
  );

  const loading = useSelector((state: RootState) => state.chat.loading);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  // Auto-scroll to bottom only for new bot messages (not for pagination)
  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    if (scrollRef.current && centerTab === "chat") {
      // If we got new messages and we weren't prepending
      if (messages.length > lastMsgCountRef.current && page === 1) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      lastMsgCountRef.current = messages.length;
    }
  }, [messages, loading, centerTab, page]);

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
        data,
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
        }
      }
    } catch (err) {
      console.error("Extraction error", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const fetchThreadTitle = async () => {
    if (!threadId) return;

    try {
      const threadsRes = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/thread/${threadId}`,
      );

      const threadTitle = threadsRes.data.title || [];

      if (threadTitle) {
        setThreadTitle(threadTitle);
      }
    } catch (e) {
      console.error("Failed to fetch thread title:", e);
    }
  };

  const fetchChatHistory = async (pageNumber: number = 1) => {
    if (!threadId || isFetchingHistory) return;
    setIsFetchingHistory(true);
    try {
      const chatHistory = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/${threadId}/chat_history?page=${pageNumber}&per_page=30`,
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
          }),
        );
      } else {
        // Prepend and Maintain scroll height
        const scrollContainer = scrollRef.current;
        const prevHeight = scrollContainer?.scrollHeight || 0;

        dispatch(
          prependMessagesForThread({
            threadId,
            messages: formattedMessages,
          }),
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
        `${API_BASE_URL}/api/talkument/bots/file/${threadId}/status`,
      );

      const allFiles = responseFile.data.files || [];
      const currentDocumentIds = allFiles.map((f: any) => f.file_id);

      // ✅ update in Redux so UI stays in sync
      if (currentDocumentIds.length > 0) {
        dispatch(
          setDocumentIds({
            threadId: threadId!,
            documentIds: currentDocumentIds,
          }),
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
        }),
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
        },
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
                }),
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
        }),
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/talkument/bots/chat/${messageId}/delete`,
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
          <Link className={styles.headerLeft} to={"/"}>
            <FileText size={20} className={styles.textAccent} />
            <h3>CourtMitra</h3>
          </Link>
        </div>

        {/* CENTER */}
        <div className={styles.headerCenterSection}>
          <h2 className={styles.threadTitle}>
            {threadTitle || "Untitled Chat"}
          </h2>
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
        <div className={styles.divisionLeft}>
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

            {leftTab === "transcript" && (
              <>
                <TranscriptEditor
                  transcript={transcript}
                  onChange={setTranscript}
                  isLoading={isProcessing}
                />

                <div className={styles.recorderSection}>
                  <button
                    className={styles.generateOrderBtn}
                    onClick={() => extractDataFromChunk(transcript)}
                    disabled={isExtracting || !transcript.trim()}
                  >
                    {isExtracting ? "Generating..." : "Generate Order"}
                  </button>

                  {!showRecorder && (
                    <>
                      <button
                        className={styles.startRecordingBtn}
                        onClick={() => setShowRecorder(true)}
                      >
                        ● Start Recording
                      </button>

                      <button
                        className={styles.uploadBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Upload Audio"}
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAudioUpload}
                        accept="audio/*"
                        style={{ display: "none" }}
                      />
                    </>
                  )}

                  {showRecorder && (
                    <div className={styles.floatingRecorder}>
                      <FloatingRecorder
                        transcript={transcript}
                        onTranscriptionStart={() => {
                          setIsProcessing(true);
                          setErrorMessage(null);
                        }}
                        onTranscriptionComplete={(text: string) => {
                          setTranscript(text);
                          setIsProcessing(false);
                        }}
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
                        onClose={() => setShowRecorder(false)}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {leftTab === "order" && (
              <OrderForm
                data={orderData}
                onUpdate={setOrderData}
                isProcessing={isExtracting}
              />
            )}
          </div>
        </div>

        {/* Divider */}
        <button className={styles.resizeHandle} />

        {/* CENTER */}
        <main className={styles.divisionCenter}>
          {/* Tabs */}
          <div className={styles.tabContainer}>
            <button
              className={centerTab === "chat" ? styles.activeTab : styles.tab}
              onClick={() => setCenterTab("chat")}
            >
              Chat
            </button>

            <button
              className={centerTab === "files" ? styles.activeTab : styles.tab}
              onClick={() => setCenterTab("files")}
            >
              Files
            </button>
          </div>

          <section className={styles.contentArea} ref={scrollRef} onScroll={handleScroll}>
            {centerTab === "chat" && (
              <>
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
              </>
            )}

            {centerTab === "files" && <FileManager />}
          </section>

          {centerTab === "chat" && (
            <ChatInput onSend={handleSend} disabled={loading} />
          )}
        </main>
      </div>
    </div>
  );
};

export default ThreadPage;
