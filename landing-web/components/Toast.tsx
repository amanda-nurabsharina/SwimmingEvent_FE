"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  AlertOctagon,
  HelpCircle,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "primary";
}

type ToastListener = (type: ToastType, message: string, options?: { title?: string; duration?: number }) => void;
type ConfirmListener = (options: ConfirmDialogOptions) => Promise<boolean>;

let globalToastListener: ToastListener | null = null;
let globalConfirmListener: ConfirmListener | null = null;

export const toast = {
  success: (message: string, options?: { title?: string; duration?: number }) => {
    if (globalToastListener) globalToastListener("success", message, options);
  },
  error: (message: string, options?: { title?: string; duration?: number }) => {
    if (globalToastListener) globalToastListener("error", message, options);
  },
  warning: (message: string, options?: { title?: string; duration?: number }) => {
    if (globalToastListener) globalToastListener("warning", message, options);
  },
  info: (message: string, options?: { title?: string; duration?: number }) => {
    if (globalToastListener) globalToastListener("info", message, options);
  },
};

export const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  if (globalConfirmListener) {
    return globalConfirmListener(options);
  }
  if (typeof window !== "undefined") {
    return Promise.resolve(window.confirm(options.message));
  }
  return Promise.resolve(true);
};

const ToastContext = createContext<any>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      confirm: confirmDialog,
    };
  }
  return {
    success: (msg: string, opt?: { title?: string; duration?: number }) => ctx.showToast("success", msg, opt),
    error: (msg: string, opt?: { title?: string; duration?: number }) => ctx.showToast("error", msg, opt),
    warning: (msg: string, opt?: { title?: string; duration?: number }) => ctx.showToast("warning", msg, opt),
    info: (msg: string, opt?: { title?: string; duration?: number }) => ctx.showToast("info", msg, opt),
    confirm: ctx.confirm,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmDialogOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: { title?: string; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const duration = options?.duration ?? 4500;
      setToasts((prev) => [...prev, { id, type, message, title: options?.title, duration }]);
    },
    []
  );

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  useEffect(() => {
    globalToastListener = showToast;
    globalConfirmListener = confirm;

    // Automatic native alert interceptor as safety net
    if (typeof window !== "undefined") {
      const originalAlert = window.alert;
      window.alert = (message?: any) => {
        const str = String(message || "");
        const lower = str.toLowerCase();
        if (
          lower.includes("gagal") ||
          lower.includes("error") ||
          lower.includes("salah") ||
          lower.includes("ditolak")
        ) {
          showToast("error", str);
        } else if (
          lower.includes("berhasil") ||
          lower.includes("sukses") ||
          lower.includes("success") ||
          lower.includes("disimpan")
        ) {
          showToast("success", str);
        } else if (
          lower.includes("wajib") ||
          lower.includes("belum") ||
          lower.includes("perhatian") ||
          lower.includes("peringatan") ||
          lower.includes("lengkap")
        ) {
          showToast("warning", str);
        } else {
          showToast("info", str);
        }
      };

      return () => {
        globalToastListener = null;
        globalConfirmListener = null;
        window.alert = originalAlert;
      };
    }
  }, [showToast, confirm]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, confirm }}>
      {children}

      {/* TOAST CONTAINER (FIXED TOP-RIGHT) */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => removeToast(item.id)} />
        ))}
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmState && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 overflow-hidden space-y-5 animate-in zoom-in-95 duration-150 pointer-events-auto">
            <div className="flex items-start gap-4">
              <div
                className={`p-3.5 rounded-2xl shrink-0 ${
                  confirmState.options.variant === "danger"
                    ? "bg-rose-100 text-rose-600 ring-4 ring-rose-50"
                    : confirmState.options.variant === "warning"
                    ? "bg-amber-100 text-amber-600 ring-4 ring-amber-50"
                    : "bg-sky-100 text-sky-600 ring-4 ring-sky-50"
                }`}
              >
                {confirmState.options.variant === "danger" ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : confirmState.options.variant === "warning" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {confirmState.options.title || "Konfirmasi Tindakan"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {confirmState.options.cancelText || "Batal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black transition-all cursor-pointer shadow-sm ${
                  confirmState.options.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : confirmState.options.variant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/20"
                }`}
              >
                {confirmState.options.confirmText || "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = item.duration || 4500;
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      setProgress((newRemaining / duration) * 100);

      if (newRemaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isPaused, duration, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const styles = {
    success: {
      border: "border-emerald-200/80 shadow-emerald-500/10",
      bgGradient: "bg-gradient-to-r from-emerald-50/95 via-white to-white",
      iconBg: "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-200/50",
      title: "text-emerald-950",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      progressBar: "bg-gradient-to-r from-emerald-500 to-teal-400",
      defaultTitle: "Berhasil",
      Icon: CheckCircle2,
    },
    error: {
      border: "border-rose-200/80 shadow-rose-500/10",
      bgGradient: "bg-gradient-to-r from-rose-50/95 via-white to-white",
      iconBg: "bg-rose-100 text-rose-600 ring-2 ring-rose-200/50",
      title: "text-rose-950",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
      progressBar: "bg-gradient-to-r from-rose-500 to-red-400",
      defaultTitle: "Terjadi Kesalahan",
      Icon: XCircle,
    },
    warning: {
      border: "border-amber-200/80 shadow-amber-500/10",
      bgGradient: "bg-gradient-to-r from-amber-50/95 via-white to-white",
      iconBg: "bg-amber-100 text-amber-600 ring-2 ring-amber-200/50",
      title: "text-amber-950",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      progressBar: "bg-gradient-to-r from-amber-500 to-orange-400",
      defaultTitle: "Peringatan",
      Icon: AlertTriangle,
    },
    info: {
      border: "border-sky-200/80 shadow-sky-500/10",
      bgGradient: "bg-gradient-to-r from-sky-50/95 via-white to-white",
      iconBg: "bg-sky-100 text-sky-600 ring-2 ring-sky-200/50",
      title: "text-sky-950",
      badge: "bg-sky-100 text-sky-800 border-sky-200",
      progressBar: "bg-gradient-to-r from-sky-500 to-blue-400",
      defaultTitle: "Informasi",
      Icon: Info,
    },
  }[item.type];

  const IconComponent = styles.Icon;
  const lines = item.message.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bgGradient} shadow-xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 opacity-100 animate-in slide-in-from-top-3 fade-in`}
    >
      <div className="p-4 sm:p-4.5 flex items-start gap-3.5">
        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${styles.iconBg}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider ${styles.title}`}>
              {item.title || styles.defaultTitle}
            </span>
          </div>

          {lines.length === 1 ? (
            <p className="text-xs font-semibold text-slate-700 leading-snug break-words">
              {lines[0]}
            </p>
          ) : (
            <div className="space-y-1 pt-0.5">
              <p className="text-xs font-bold text-slate-800 leading-snug">{lines[0]}</p>
              <ul className="space-y-0.5 text-[11px] text-slate-600 font-medium list-disc list-inside">
                {lines.slice(1).map((line, i) => (
                  <li key={i} className="leading-snug">
                    {line.replace(/^-\s*/, "")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* AUTO DISMISS PROGRESS BAR */}
      <div className="h-1 w-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${styles.progressBar} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
