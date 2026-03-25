import React, { createContext, useContext, useState, useCallback } from "react";
import Modal from "../components/shared/Modal";
import Button from "../components/shared/Button";

interface AlertOptions {
  confirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => Promise<void>;
  showConfirm: (
    message: string,
    options?: Omit<AlertOptions, "confirm">
  ) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    message: string;
    options?: AlertOptions;
    resolve?: (value: any) => void;
  }>({ message: "", options: {} });

  const showAlert = useCallback(
    (message: string, options?: AlertOptions): Promise<void> => {
      return new Promise((resolve) => {
        setConfig({
          message,
          options: { ...options, confirm: false },
          resolve: () => resolve(),
        });
        setIsOpen(true);
      });
    },
    []
  );

  const showConfirm = useCallback(
    (
      message: string,
      options?: Omit<AlertOptions, "confirm">
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig({
          message,
          options: { ...options, confirm: true },
          resolve,
        });
        setIsOpen(true);
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (config.resolve && !config.options?.confirm) {
      config.resolve(true);
    } else if (config.resolve && config.options?.confirm) {
      config.resolve(false);
    }
  }, [config]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (config.options?.onConfirm) config.options.onConfirm();
    if (config.resolve) config.resolve(true);
  }, [config]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (config.options?.onCancel) config.options.onCancel();
    if (config.resolve) config.resolve(false);
  }, [config]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={
          config.options?.title ||
          (config.options?.confirm ? "Confirm" : "Alert")
        }
        size="sm"
        footer={
          config.options?.confirm ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {config.options.cancelLabel || "Cancel"}
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirm}>
                {config.options.confirmLabel || "Confirm"}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={handleClose}>
              {config.options?.confirmLabel || "OK"}
            </Button>
          )
        }
      >
        <div style={{ wordBreak: "break-word" }}>{config.message}</div>
      </Modal>
    </AlertContext.Provider>
  );
};
