import { useState, useRef, useCallback, useEffect } from "react";
import { WS_URL } from "../components/AudioRecorder/AudioRecorder.logic";

let activeRecorderId: string | null = null; // 🔥 GLOBAL LOCK

const mergeTranscriptChunk = (previous: string, incoming: string) => {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return previous;
  if (!prev) return next;

  if (next.startsWith(prev)) return next;
  if (prev.startsWith(next)) return prev;

  return `${prev} ${next}`.replaceAll(/\s+/g, " ").trim();
};

export function useTranscriber() {
  const idRef = useRef(`recorder_${Math.random()}`); // 🔥 UNIQUE INSTANCE

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>("");

  const stopResources = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      setTimeout(() => wsRef.current?.close(), 100);
      wsRef.current = null;
    }
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    processorRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopResources();
    setIsRecording(false);
    isRecordingRef.current = false;

    // 🔥 release lock
    if (activeRecorderId === idRef.current) {
      activeRecorderId = null;
    }
  }, [stopResources]);

  const start = useCallback(
    async (language: string = "gu-IN") => {
      // 🔥 BLOCK if another recorder active
      if (activeRecorderId && activeRecorderId !== idRef.current) {
        setError("Another recording is in progress");
        return;
      }

      activeRecorderId = idRef.current;

      try {
        setError(null);
        setTranscript("");
        transcriptRef.current = "";

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        const audioCtx = new AudioContext({ sampleRate: 16000 });
        await audioCtx.resume();
        audioCtxRef.current = audioCtx;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: "start",
              sampleRate: audioCtx.sampleRate,
              language,
            })
          );
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "transcript") {
            const text = msg.data?.transcript || msg.data?.text;
            if (text) {
              const merged = mergeTranscriptChunk(transcriptRef.current, text);
              transcriptRef.current = merged;
              setTranscript(merged);
            }
          }
        };

        ws.onerror = () => {
          setError("Connection error");
          stop();
        };

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);

        sourceRef.current = source;
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isRecordingRef.current && ws.readyState === WebSocket.OPEN) {
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(input.length);

            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);

        setIsRecording(true);
        isRecordingRef.current = true;
      } catch (err) {
        console.error("Transcription error:", err);
        setError("Mic access denied");
      }
    },
    [stop]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { isRecording, transcript, start, stop, error };
}
