import styles from "./ChatMessages.module.css";
import { Copy, Check, ChevronDown, Trash2, X } from "lucide-react";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import gsap from "gsap";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
}

interface Props {
  readonly messages: Message[];
  readonly loading: boolean;
  readonly onDelete?: (id: string) => void;
}

const DeleteModal = ({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.9, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div
        ref={modalRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Delete message?</h3>
          <button onClick={onCancel} className={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>This action cannot be undone.</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmDeleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageMenu = ({
  text,
  msgId,
  onDelete,
  canDelete,
}: {
  text: string;
  msgId: string;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.menuContainer} ref={menuRef}>
      <button className={styles.menuTrigger} onClick={() => setIsOpen(!isOpen)}>
        <ChevronDown size={18} />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <button className={styles.dropdownItem} onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>Copy</span>
          </button>
          {canDelete && !msgId.toString().includes("-") && (
            <button
              className={styles.dropdownItem}
              onClick={() => {
                setShowModal(true);
                setIsOpen(false);
              }}
            >
              <Trash2 size={16} className={styles.trashIcon} />
              <span className={styles.trashText}>Delete</span>
            </button>
          )}
        </div>
      )}

      <DeleteModal
        isOpen={showModal}
        onCancel={() => setShowModal(false)}
        onConfirm={() => {
          onDelete(msgId);
          setShowModal(false);
        }}
      />
    </div>
  );
};

const ChatMessages: React.FC<Props> = ({ messages, onDelete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  useLayoutEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const newMessages = Array.from(
        containerRef.current?.children || []
      ).slice(prevMessagesLength.current);

      gsap.fromTo(
        newMessages,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
        }
      );
    } else if (messages.length > 0 && prevMessagesLength.current === 0) {
      // First load
      gsap.fromTo(
        containerRef.current?.children || [],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.out",
        }
      );
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  return (
    <div className={styles.messagesContainer} ref={containerRef}>
      {messages.map((msg) => (
        <div
          key={msg.id + msg.sender}
          className={msg.sender === "user" ? styles.rowRight : styles.rowLeft}
        >
          <div
            className={
              msg.sender === "user" ? styles.userMessage : styles.botMessage
            }
          >
            {onDelete && (
              <MessageMenu
                text={msg.text}
                msgId={msg.id}
                onDelete={onDelete}
                canDelete={msg.sender === "user"}
              />
            )}
            <div
              className={styles.messageBody}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;
