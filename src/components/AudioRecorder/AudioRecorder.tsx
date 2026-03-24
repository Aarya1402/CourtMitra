import { useRef, useState, useEffect } from "react";
import styles from "./AudioRecorder.module.css";
import { WS_URL } from "./AudioRecorder.logic";

export type AudioRecorderProps = Readonly<{
  threadId?: string;
  transcript?: string;
  onTranscriptionStart?: () => void;
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
  onAudioBlobComplete?: (blob: Blob) => void;
  resetTranscript?: () => void;
  onClose?: () => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  title?: string;
}>;

const mergeTranscriptChunk = (previous: string, incoming: string) => {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return previous;
  if (!prev) return next;

  // If backend sends full cumulative text, trust it and replace.
  if (next.startsWith(prev)) return next;
  // If backend repeats older content, keep the longest stable transcript.
  if (prev.startsWith(next)) return prev;

  // For delta chunks, append with spacing.
  return `${prev} ${next}`.replace(/\s+/g, " ").trim();
};

export default function AudioRecorder({
  transcript = "",
  onTranscriptionStart,
  onTranscriptionComplete,
  onTranscriptionError,
  onAudioBlobComplete,
  resetTranscript,
  onClose,
  onRecordingStateChange,
  title,
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [fileName, setFileName] = useState("recording");
  const [duration, setDuration] = useState(0);
  const [barHeights, setBarHeights] = useState(new Array(40).fill(2));
  const [language, setLanguage] = useState("unknown"); // Defaulting to Gujarati as requested
  const timerRef = useRef<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>("");
  const stopResources = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => wsRef.current?.close(), 100);
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopResources();
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Sync ref with the transcript prop so we always append to the latest version (including manual edits)
  useEffect(() => {
    if (!isRecordingRef.current) {
      transcriptRef.current = transcript;
    }
  }, [transcript]);

  const drawBars = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const bars = new Array(40).fill(0).map((_, i) => {
      const slice = Math.floor(data.length / 40);
      const start = i * slice;
      let sum = 0;
      for (let j = start; j < start + slice; j++) sum += data[j];
      const avg = sum / slice;
      return Math.max(2, (avg / 255) * 64);
    });
    setBarHeights(bars);
    animFrameRef.current = requestAnimationFrame(drawBars);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (
        globalThis.AudioContext || (globalThis as any).webkitAudioContext
      )({
        sampleRate: 16000,
      });
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      console.log("AudioContext created with sampleRate:", audioCtx.sampleRate);
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Start streaming WebSocket
      console.log("Connecting to WebSocket:", WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      transcriptRef.current = "";
      if (onTranscriptionStart) onTranscriptionStart();

      ws.onopen = () => {
        console.log("WebSocket connected to backend");
        ws.send(
          JSON.stringify({
            type: "start",
            sampleRate: audioCtx.sampleRate,
            language: language,
          }),
        );
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        if (onTranscriptionError) onTranscriptionError("Connection error");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("WS Message from backend:", JSON.stringify(msg));
          if (msg.type === "transcript") {
            // Handle both structured data and flat strings
            const text =
              msg.data?.transcript ||
              msg.data?.text ||
              (typeof msg.data === "string" ? msg.data : null);
            if (text) {
              const mergedText = mergeTranscriptChunk(
                transcriptRef.current,
                text,
              );
              transcriptRef.current = mergedText;
              if (onTranscriptionComplete) onTranscriptionComplete(mergedText);
            }
          } else if (msg.type === "error") {
            console.error("Backend reported error:", msg.message);
            if (onTranscriptionError) onTranscriptionError(msg.message);
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (
          isRecordingRef.current &&
          !isPausedRef.current &&
          ws.readyState === WebSocket.OPEN
        ) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp and convert to 16-bit PCM
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          ws.send(pcm16.buffer);
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        if (onAudioBlobComplete) onAudioBlobComplete(blob);
        setBarHeights(new Array(40).fill(2));
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      if (onRecordingStateChange) onRecordingStateChange(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;
      setAudioURL("");
      setDuration(0);

      timerRef.current = globalThis.setInterval(
        () => setDuration((d) => d + 1),
        1000,
      );
      drawBars();
    } catch (err) {
      console.error("Mic access denied", err);
      if (onTranscriptionError) onTranscriptionError("Mic access denied");
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      isPausedRef.current = false;
      timerRef.current = globalThis.setInterval(
        () => setDuration((d) => d + 1),
        1000,
      );
      drawBars();
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      isPausedRef.current = true;
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setBarHeights(new Array(40).fill(2));
    }
  };

  const resetRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null; // Skip transcription
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());

    stopResources();

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsRecording(false);
    if (onRecordingStateChange) onRecordingStateChange(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setAudioURL("");
    setDuration(0);
    setBarHeights(new Array(40).fill(2));
    chunksRef.current = [];

    resetTranscript?.();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());

    stopResources();

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRecording(false);
    if (onRecordingStateChange) onRecordingStateChange(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;

    setTimeout(() => {
      if (!transcriptRef.current.trim()) {
        onTranscriptionComplete?.(""); // force completion
      }
    }, 200);
  };

  const saveAsMP3 = async () => {
    if (!audioURL) return;

    const response = await fetch(audioURL);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const samples = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const mp3encoder = new (globalThis as any).lamejs.Mp3Encoder(
      1,
      sampleRate,
      128,
    );

    const sampleBlockSize = 1152;
    const mp3Data = [];

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(
        Int16Array.from(sampleChunk.map((n) => n * 32767)),
      );
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    const mp3Blob = new Blob(mp3Data, { type: "audio/mp3" });

    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "recording"}.mp3`;
    a.click();
  };
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const getStatusClass = () => {
    if (isActive) return styles.active;
    if (isPaused) return styles.paused;
    return "";
  };

  const getStatusText = () => {
    if (isActive) return "● Recording";
    if (isPaused) return "⏸ Paused";
    if (audioURL) return "✓ Ready";
    return "Standby";
  };

  const isActive = isRecording && !isPaused;

  return (
    <div className={styles.outerWrap}>
      <div className={styles.card}>
        {/* Reset Button */}
        <button
          className={styles.btnReset}
          onClick={resetRecording}
          title="Reset Recording"
        >
          Reset
        </button>

        {/* Brand */}
        <div className={styles.brand}>
          <span
            className={`${styles.recDot} ${isActive ? "" : styles.inactive}`}
          />{" "}
          {title || "Recorder Studio"}
        </div>

        {/* Timer */}
        <div className={styles.timer}>{formatTime(duration)}</div>
        <div className={`${styles.statusLabel} ${getStatusClass()}`}>
          {getStatusText()}
        </div>

        {/* Waveform */}
        <div className={styles.waveform}>
          {barHeights.map((h, i) => (
            <div
              key={`bar-${i}-${h}`}
              className={styles.bar}
              style={{
                height: `${h}px`,
                opacity: isActive ? 0.85 : 0.2,
                background: isPaused ? "#f5a623" : "#ff3c3c",
              }}
            />
          ))}
        </div>

        {/* File name */}
        <div className={styles.inputGroup}>
          <div className={styles.fieldWrap}>
            <div className={styles.fieldLabel}>Language</div>
            <select
              className={styles.languageSelect}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isRecording}
            >
              <option value="gu-IN">Gujarati</option>
              <option value="en-IN">English</option>
              <option value="hi-IN">Hindi</option>
              <option value="ta-IN">Tamil</option>
              <option value="te-IN">Telugu</option>
              <option value="kn-IN">Kannada</option>
              <option value="ml-IN">Malayalam</option>
              <option value="mr-IN">Marathi</option>
              <option value="bn-IN">Bengali</option>
              <option value="pa-IN">Punjabi</option>
              <option value="od-IN">Odia</option>
              <option value="unknown">Auto-detect</option>
            </select>
          </div>
          <div className={styles.fieldWrap}>
            <div className={styles.fieldLabel}>File name</div>
            <input
              className={styles.filenameInput}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="recording"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.btnRow}>
          <button
            className={`${styles.btn} ${styles.btnRecord} ${isRecording ? styles.recording : ""}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? "■ Stop" : "● Record"}
          </button>

          <button
            className={`${styles.btn} ${styles.btnPause} ${isPaused ? styles.paused : ""}`}
            onClick={togglePause}
            disabled={!isRecording}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>

          {audioURL && (
            <button
              className={`${styles.btn} ${styles.btnSave} ${styles.ready}`}
              onClick={saveAsMP3}
            >
              <span style={{ fontSize: "13px" }}>↓ Save</span>
            </button>
          )}

          {audioURL && (
            <button
              className={`${styles.btn} ${styles.btnDone} ${styles.ready}`}
              onClick={() => {
                onClose?.();
              }}
            >
              <span style={{ fontSize: "13px" }}>Done</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
