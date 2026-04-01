import React from "react";
import styles from "./Modal.module.css";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdropButton}
        onClick={onClose}
        aria-label="Close modal"
      />
      <dialog
        open
        className={`${styles.modal} ${styles[size]}`}
        aria-labelledby="modal-title"
      >
        <header className={styles.header}>
          <h3 id="modal-title">{title}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <section className={styles.content}>{children}</section>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </dialog>
    </div>
  );
};

export default Modal;
