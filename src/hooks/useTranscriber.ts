import { useState, useRef, useCallback, useEffect } from 'react';
import { WS_URL } from '../components/AudioRecorder/AudioRecorder.logic';

export function useTranscriber() {
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

  const clearTranscript = useCallback(() => {
    setTranscript("");
    transcriptRef.current = "";
  }, []);

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      setTimeout(() => wsRef.current?.close(), 100);
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  const start = useCallback(async (language: string = "unknown") => {
    try {
      setError(null);
      setTranscript("");
      transcriptRef.current = "";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ 
          type: 'start', 
          sampleRate: audioCtx.sampleRate,
          language
        }));
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("Connection error");
        stop();
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'transcript') {
             const text = msg.data?.transcript || msg.data?.text || (typeof msg.data === 'string' ? msg.data : null);
             if (text) {
               const newFullText = transcriptRef.current + (transcriptRef.current ? " " : "") + text;
               transcriptRef.current = newFullText;
               setTranscript(newFullText);
             }
          } else if (msg.type === 'error') {
            setError(msg.message);
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (isRecordingRef.current && ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
             const s = Math.max(-1, Math.min(1, inputData[i]));
             pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          ws.send(pcm16.buffer);
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (err) {
      console.error("Mic access denied", err);
      setError("Mic access denied");
    }
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isRecording,
    transcript,
    start,
    stop,
    clearTranscript,
    error
  };
}
