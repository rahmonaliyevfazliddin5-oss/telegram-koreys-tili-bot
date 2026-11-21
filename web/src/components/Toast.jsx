import { useState, useEffect } from "preact/hooks";

let toastNotifier = null;

export function showToast(message, type = "info") {
  // String bo'lishini kafolatlash (B2 xatosining oldini olish)
  const safeMessage = typeof message === "string" ? message : (message?.message || String(message));
  if (toastNotifier) {
    toastNotifier(safeMessage, type);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastNotifier = (message, type) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };

    return () => {
      toastNotifier = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div class="toast-container" id="toastContainer">
      {toasts.map((t) => (
        <div key={t.id} class={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
