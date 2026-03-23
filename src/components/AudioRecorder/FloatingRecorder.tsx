import Draggable from "react-draggable";
import { useRef } from "react";
import AudioRecorder from "./AudioRecorder";
import type { AudioRecorderProps } from "./AudioRecorder";

const FloatingRecorder = (props: AudioRecorderProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        style={{
          position: "fixed",
          top: "100px",
          left: "100px",
          zIndex: 9999,
          width: "340px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        {/* 🔥 Drag handle MUST be here */}
        <div
          style={{
            cursor: "move",
            padding: "8px",
            background: "#eee",
            fontSize: "12px",
          }}
        >
          Recorder{" "}
          <button onClick={props.onClose} style={{ float: "right" }}>
            ✕
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          <AudioRecorder {...props} />
        </div>
      </div>
    </Draggable>
  );
};

export default FloatingRecorder;
