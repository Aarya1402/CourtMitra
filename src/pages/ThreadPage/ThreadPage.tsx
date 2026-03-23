import React, { useState, useEffect, useRef } from "react";
import TranscriptEditor from "../../components/TranscriptEditor/TranscriptEditor";
import FileManager from "../../components/FileManager/FileManager";
import { User, MessageSquare, Plus, LogOut, Wand2 } from "lucide-react";
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
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState("");
  const [showRecorder, setShowRecorder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [activeTab, setActiveTab] = useState<"order" | "chat">("chat");
  const [orderData, setOrderData] = useState<OrderData>(initialOrderData);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const lastProcessedTranscriptRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const dispatch = useDispatch();
  const botId = useSelector((state: RootState) => state.bot.botId);

  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  console.log(activeTab);

  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("Please upload a valid audio file.");
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
  useEffect(() => {
    if (scrollRef.current && activeTab === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, activeTab]);

  // Load persistent workspace state on mount
  useEffect(() => {
    if (threadId) {
      loadThreadState(threadId).then((state) => {
        if (state) {
          if (state.transcript && transcript === "")
            setTranscript(state.transcript);
          if (state.orderData)
            setOrderData(normalizeOrderData(state.orderData));
          if (state.audioBlob) setAudioBlob(state.audioBlob);
          lastProcessedTranscriptRef.current = state.transcript
            ? state.transcript
            : "";
        }
        setIsStateLoaded(true);
      });
    }
  }, [threadId, transcript]);

  // Save persistent workspace state whenever it updates (after initial load)
  useEffect(() => {
    if (threadId && isStateLoaded) {
      saveThreadState(threadId, { transcript, orderData, audioBlob });
    }
  }, [transcript, orderData, audioBlob, threadId, isStateLoaded]);

  const extractDataFromChunk = async (fullTranscript: string) => {
    setIsExtracting(true);
    setActiveTab("order");
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

  const fetchChatHistory = async () => {
    if (!threadId) return;
    try {
      const chatHistory = await axios.get(
        `${API_BASE_URL}/api/talkument/bots/${threadId}/chat_history?page=1&per_page=30`,
      );
      const history = chatHistory.data.history || [];

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
      dispatch(
        setMessagesForThread({
          threadId,
          messages: formattedMessages,
        }),
      );
      console.log(botId);
      // Fetch the thread title if botId is present
      if (botId) {
        try {
          const threadsRes = await axios.get(
            `${API_BASE_URL}/api/talkument/bots/${botId}/threads?page=1&per_page=100`,
          );
          const allThreads = threadsRes.data.threads || [];
          const currentThread = allThreads.find(
            (s: any) => s.thread_uuid === threadId,
          );
          if (currentThread) {
            console.log("Current thread details:", currentThread.title);
            setThreadTitle(currentThread.title);
          }
        } catch (e) {
          console.error("Failed to fetch thread title:", e);
        }
      }
    } catch (err) {
      console.error("Error fetching history for thread:", threadId, " ", err);
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
      {/* Division 1: Leftmost Part (Sidebar + Recorder + Transcript) */}
      <aside
        className={styles.divisionLeft}
        style={{ width: leftWidth, flexShrink: 0 }}
      >
        <div className={styles.transcriptSection}>
          {errorMessage && (
            <div className={styles.errorBanner}>
              {errorMessage}
              <button onClick={() => setErrorMessage(null)}>Dismiss</button>
            </div>
          )}
          <TranscriptEditor
            transcript={transcript}
            onChange={setTranscript}
            isLoading={isProcessing}
          />
          <button
            className={styles.generateOrderBtn}
            onClick={() => extractDataFromChunk(transcript)}
            disabled={isExtracting || !transcript.trim()}
          >
            {isExtracting ? (
              "Generating..."
            ) : (
              <>
                <Wand2 size={16} /> Generate Order
              </>
            )}
          </button>
        </div>
        <div className={styles.recorderSection}>
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
      </aside>

      <button
        className={styles.resizeHandle}
        onMouseDown={() => setIsDraggingLeft(true)}
        data-resize-handle-state={isDraggingLeft ? "drag" : "idle"}
      />

      {/* Division 2: Center Part (Main Interaction Area) */}
      <main className={styles.divisionCenter} style={{ flex: 1, minWidth: 0 }}>
        <header className={styles.mainHeader}>
          <div
            className={styles.searchBar}
            style={{
              background: "transparent",
              padding: 0,
              justifyContent: "flex-start",
              flex: 1,
              minWidth: 0,
            }}
          >
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 600,
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {threadTitle || "Untitled Chat"}
            </h2>
          </div>

          <div className={styles.headerNav}>
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
        </header>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabContainer}>
            <button
              className={activeTab === "order" ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab("order")}
            >
              Order Details / PDF
            </button>
            <button
              className={activeTab === "chat" ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab("chat")}
            >
              Chat Section
            </button>
          </div>
        </div>

        <section className={styles.contentArea} ref={scrollRef}>
          {activeTab === "order" && (
            <OrderForm
              data={orderData}
              onUpdate={setOrderData}
              isProcessing={isExtracting}
            />
          )}

          {activeTab === "chat" &&
            (filteredMessages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.iconCircle}>
                  <MessageSquare size={32} />
                </div>
                <h2>Universal Workspace</h2>
                <p>Select a document or start a new conversation to begin.</p>
              </div>
            ) : (
              <ChatMessages
                messages={filteredMessages}
                loading={loading}
                onDelete={handleDelete}
              />
            ))}
        </section>
        {activeTab === "chat" && (
          <ChatInput onSend={handleSend} disabled={loading} />
        )}
      </main>

      <button
        className={styles.resizeHandle}
        onMouseDown={() => setIsDraggingRight(true)}
        data-resize-handle-state={isDraggingRight ? "drag" : "idle"}
      />

      {/* Division 3: Right Part (File Manager) */}
      <aside
        className={styles.divisionRight}
        style={{ width: rightWidth, flexShrink: 0 }}
      >
        <FileManager />
      </aside>
    </div>
  );
};

export default ThreadPage;
