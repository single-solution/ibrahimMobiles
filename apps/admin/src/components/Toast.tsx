"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { classNames } from "@store/shared";

type ToastTone = "success" | "info" | "warn" | "danger";

interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  danger: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "border-[var(--color-accent-200)] bg-[var(--color-accent-50)] text-[var(--color-accent-800)]",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

const TONE_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  info: <Info size={16} />,
  warn: <AlertTriangle size={16} />,
  danger: <XCircle size={16} />,
};

const TOAST_AUTO_DISMISS_MS = 3_500;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push(message, "success"),
      info: (message) => push(message, "info"),
      warn: (message) => push(message, "warn"),
      danger: (message) => push(message, "danger"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
}

function ToastItem({ message, tone, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="status"
      className={classNames(
        "pointer-events-auto flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-3 shadow-[var(--shadow-md)] backdrop-blur transition-all duration-200",
        TONE_CLASSES[tone],
        isVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
      )}
    >
      <span className="mt-0.5 shrink-0">{TONE_ICONS[tone]}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-m-1 grid size-6 shrink-0 place-items-center rounded text-current opacity-70 transition-opacity hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return api;
}
