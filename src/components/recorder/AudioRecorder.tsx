import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Pause, Play, Save, RotateCcw } from "lucide-react";
import Button from "../shared/Button";
import { useAlert } from "../../context/AlertContext";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
}) => {
  const { showAlert } = useAlert();
  const [status, setStatus] = useState<
    "idle" | "recording" | "paused" | "completed"
  >("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [fileName, setFileName] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    timerRef.current = globalThis.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        onRecordingComplete(audioBlob);
      };

      mediaRecorder.start();
      setStatus("recording");
      startTimer();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      showAlert("Microphone access denied or not available.", { title: "Error" });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && status === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setStatus("completed");
      stopTimer();
    }
  };

  const saveRecording = () => {
    if (audioChunksRef.current.length === 0) return;
    const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = fileName.trim() || `recording-${new Date().toISOString()}`;
    a.download = name.endsWith(".wav") ? name : `${name}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetRecording = () => {
    setStatus("idle");
    setRecordingTime(0);
    setFileName("");
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-recorder-container">
      <div className="recorder-header">
        <div className="status-indicator">
          <div className={`status-orb ${status}`} />
          <span className="status-text">
            {status === "idle" ? "Ready" : status.toUpperCase()}
          </span>
        </div>
        <div className="timer">{formatTime(recordingTime)}</div>
      </div>

      <div className="visualization-area">
        {status === "recording" ? (
          <div className="wave-container">
            {[new Array(12)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : (
          <div className="waveform-placeholder" />
        )}
      </div>

      <div className="recorder-controls">
        {status === "idle" ? (
          <Button
            onClick={startRecording}
            icon={<Mic size={20} />}
            className="w-full primary-glow"
          >
            Start Recording
          </Button>
        ) : (
          <div className="controls-grid">
            {status !== "completed" && (
              <Button
                onClick={
                  status === "recording" ? pauseRecording : resumeRecording
                }
                variant="outline"
                icon={
                  status === "recording" ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} />
                  )
                }
              >
                {status === "recording" ? "Pause" : "Resume"}
              </Button>
            )}

            {status !== "completed" ? (
              <Button
                onClick={stopRecording}
                variant="danger"
                icon={<Square size={18} />}
              >
                Complete
              </Button>
            ) : (
              <div className="completed-state">
                <input
                  type="text"
                  className="file-name-input"
                  placeholder="Enter recording name..."
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  autoFocus
                />
                <div className="completed-actions">
                  <Button
                    onClick={saveRecording}
                    variant="primary"
                    icon={<Save size={18} />}
                    className="flex-1"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={resetRecording}
                    variant="outline"
                    className="reset-btn"
                    icon={<RotateCcw size={18} />}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .audio-recorder-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .recorder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }
        .status-orb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-muted);
        }
        .status-orb.recording {
          background: var(--danger);
          box-shadow: 0 0 8px var(--danger);
          animation: orb-pulse 1.5s infinite;
        }
        .status-orb.paused { background: var(--warning); }
        .status-orb.completed { background: var(--success); }
        
        @keyframes orb-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }

        .timer {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .visualization-area {
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wave-container {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 24px;
        }

        .wave-bar {
          width: 3px;
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          animation: wave 1.2s ease-in-out infinite;
        }

        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }

        .waveform-placeholder {
          width: 100%;
          height: 1px;
          background: var(--border-strong);
          border-radius: 2px;
          opacity: 0.2;
        }

        .recorder-controls { width: 100%; }
        .controls-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 0.75rem; 
        }
        .completed-state {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }
        .file-name-input {
          padding: 0.625rem 1rem;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .file-name-input:focus {
          border-color: var(--accent);
        }
        .completed-actions { display: flex; gap: 0.75rem; width: 100%; }
        .flex-1 { flex: 1; }
        .reset-btn { width: 42px; padding: 0.625rem 0.5rem; }
        .primary-glow:hover { box-shadow: 0 0 15px rgba(99, 102, 241, 0.3); }
        .w-full { width: 100%; }
      `}</style>
    </div>
  );
};

export default AudioRecorder;
