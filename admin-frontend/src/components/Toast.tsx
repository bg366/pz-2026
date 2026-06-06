import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastType = "success" | "error";
type ToastEntry = { id: number; message: string; type: ToastType };
type ToastContextValue = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      type === "error" ? 5000 : 3500
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: "fixed", top: "20px", right: "20px", zIndex: 9999,
        display: "flex", flexDirection: "column", gap: "10px",
        maxWidth: "380px", width: "calc(100vw - 40px)", pointerEvents: "none"
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "14px 18px", borderRadius: "14px",
              background: t.type === "success" ? "#ecfdf5" : "#fff1f2",
              color: t.type === "success" ? "#047857" : "#be123c",
              border: `1px solid ${t.type === "success" ? "#a7f3d0" : "#fecdd3"}`,
              boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
              fontSize: "14px", fontWeight: 500, lineHeight: 1.5,
              pointerEvents: "auto",
              cursor: "default",
              animation: "toastIn 0.2s ease"
            }}
          >
            <span style={{ fontWeight: 700, marginRight: "6px" }}>
              {t.type === "success" ? "✓" : "✕"}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
