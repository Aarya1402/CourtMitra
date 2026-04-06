import { useRef, useState, useEffect, useCallback } from "react";
import styles from "./AudioRecorder.module.css";
import { WS_URL } from "./AudioRecorder.logic";

export type AudioRecorderProps = Readonly<{
  autoStart: boolean;
  threadId?: string;
  transcript?: string;
  onTranscriptionStart?: () => void;
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
  onAudioBlobComplete?: (blob: Blob) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  setShowRecorder?: (show: boolean) => void;
  setAudioURL: (url: string) => void;
  title?: string;
  language: string;
}>;

const mergeTranscriptChunk = (previous: string, incoming: string) => {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return previous;
  if (!prev) return next;

  if (next.startsWith(prev)) return next;
  if (prev.startsWith(next)) return prev;

  return `${prev} ${next}`.replaceAll(/\s+/g, " ").trim();
};

export default function AudioRecorder({
  autoStart,
  transcript = "",
  onTranscriptionStart,
  onTranscriptionComplete,
  onTranscriptionError,
  onAudioBlobComplete,
  onRecordingStateChange,
  setShowRecorder,
  setAudioURL,
  language,
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const workletRef = useRef<AudioWorkletNode | null>(null); // ✅ NEW

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [duration, setDuration] = useState(0);
  const [barHeights, setBarHeights] = useState(new Array(40).fill(2));

  const timerRef = useRef<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>("");

  const stopResources = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => wsRef.current?.close(), 100);
      wsRef.current = null;
    }

    // ❌ removed ScriptProcessor cleanup
    // ✅ AudioWorklet cleanup
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop();
      }
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

      for (let j = start; j < start + slice; j++) {
        sum += data[j];
      }

      const avg = sum / slice;
      return Math.max(2, (avg / 255) * 64);
    });

    setBarHeights(bars);
    animFrameRef.current = requestAnimationFrame(drawBars);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (
        globalThis.AudioContext ||
        (globalThis as unknown as Record<string, typeof AudioContext>)
          .webkitAudioContext
      )({
        sampleRate: 16000,
      });

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      transcriptRef.current = "";
      onTranscriptionStart?.();

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "start",
            sampleRate: audioCtx.sampleRate,
            language,
          })
        );
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        onTranscriptionError?.("Connection error");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "transcript") {
            const text =
              msg.data?.transcript ||
              msg.data?.text ||
              (typeof msg.data === "string" ? msg.data : null);

            if (text) {
              const merged = mergeTranscriptChunk(transcriptRef.current, text);
              transcriptRef.current = merged;
              onTranscriptionComplete?.(merged);
            }
          } else if (msg.type === "error") {
            onTranscriptionError?.(msg.message);
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      // 🔥 AUDIO WORKLET (REPLACEMENT)
      await audioCtx.audioWorklet.addModule("/pcm-processor.js");

      const worklet = new AudioWorkletNode(audioCtx, "pcm-processor");
      workletRef.current = worklet;

      worklet.port.onmessage = (event) => {
        if (
          isRecordingRef.current &&
          !isPausedRef.current &&
          ws.readyState === WebSocket.OPEN
        ) {
          ws.send(event.data);
        }
      };

      source.connect(worklet);
      worklet.connect(audioCtx.destination);

      // MediaRecorder (UNCHANGED)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        const url = URL.createObjectURL(blob);
        setAudioURL(url);

        onAudioBlobComplete?.(blob);

        setBarHeights(new Array(40).fill(2));

        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };

      mediaRecorder.start();

      setIsRecording(true);
      onRecordingStateChange?.(true);

      isRecordingRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;

      setAudioURL("");
      setDuration(0);

      timerRef.current = globalThis.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      drawBars();
    } catch (err) {
      console.error("Mic access denied", err);
      onTranscriptionError?.("Mic access denied");
    }
  }, [
    onTranscriptionStart,
    onTranscriptionComplete,
    onTranscriptionError,
    onRecordingStateChange,
    onAudioBlobComplete,
    setAudioURL,
    language,
    drawBars,
  ]);

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (autoStart && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setTimeout(() => startRecording(), 0);
    }
  }, [autoStart, startRecording]);

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      isPausedRef.current = false;

      timerRef.current = globalThis.setInterval(
        () => setDuration((d) => d + 1),
        1000
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

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop();
      }
    }

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
    onRecordingStateChange?.(false);

    isRecordingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;

    setShowRecorder?.(false);

    setTimeout(() => {
      if (!transcriptRef.current.trim()) {
        onTranscriptionComplete?.("");
      }
    }, 200);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");

    const sec = (s % 60).toString().padStart(2, "0");

    return `${m}:${sec}`;
  };

  const isActive = isRecording && !isPaused;

  return (
    <div className={styles.inlineRecorder}>
      <span className={styles.timerInline}>{formatTime(duration)}</span>

      <div className={styles.waveformInline}>
        {barHeights.map((h, i) => (
          <div
            key={`bar-${i}-${h}`}
            className={styles.barInline}
            style={{
              height: `${h}px`,
              opacity: isActive ? 0.85 : 0.2,
              background: isPaused ? "#f5a623" : "#ff3c3c",
            }}
          />
        ))}
      </div>

      <button
        className={`${styles.btn} ${styles.btnRecord}`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? "■ Stop" : "● Record"}
      </button>

      <button
        className={`${styles.btn} ${styles.btnPause}`}
        onClick={togglePause}
        disabled={!isRecording}
      >
        {isPaused ? "▶ Resume" : "⏸ Pause"}
      </button>
    </div>
  );
}
