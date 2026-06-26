"use client";

import React, { createContext, useContext, useState } from "react";
import { AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react";

type AlertType = "info" | "success" | "error" | "warning";

interface AlertOptions {
  title?: string;
  type?: AlertType;
}

interface Toast {
  id: string;
  message: string;
  title?: string;
  type: AlertType;
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const animationStyles = `
@keyframes toastSlideIn {
  from {
    transform: translateX(120%) translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0) translateY(0);
    opacity: 1;
  }
}
.animate-toast-in {
  animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
`;

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showAlert = (msg: string, options?: AlertOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Capitalize type if title is omitted
    const defaultTitle = options?.type 
      ? options.type.charAt(0).toUpperCase() + options.type.slice(1) 
      : "Notification";

    const newToast: Toast = {
      id,
      message: msg,
      title: options?.title || defaultTitle,
      type: options?.type || "info",
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: AlertType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  const getBorderColor = (type: AlertType) => {
    switch (type) {
      case "success":
        return "border-l-green-500 border-neutral-800";
      case "error":
        return "border-l-red-500 border-neutral-800";
      case "warning":
        return "border-l-amber-500 border-neutral-800";
      default:
        return "border-l-blue-500 border-neutral-800";
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full bg-neutral-900/95 backdrop-blur-md border border-neutral-800/80 border-l-4 ${getBorderColor(
              toast.type
            )} rounded-2xl p-4 shadow-xl flex items-start gap-3 pointer-events-auto animate-toast-in`}
          >
            {/* Icon */}
            {getIcon(toast.type)}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white tracking-tight">{toast.title}</h4>
              <p className="text-xs text-neutral-350 mt-1 leading-relaxed whitespace-pre-wrap">
                {toast.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-0.5 rounded-lg hover:bg-neutral-800 shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
