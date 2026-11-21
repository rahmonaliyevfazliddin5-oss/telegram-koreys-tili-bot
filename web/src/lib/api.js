import { getInitData, haptic } from "./tg.js";

// Global xatolarni ushlash
if (typeof window !== "undefined") {
  window.onerror = (message, source, lineno, colno, error) => {
    const errorStr = typeof message === "string" ? message : (error?.message || "Noma'lum xatolik");
    console.error("Global window.onerror:", errorStr);
  };

  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const errorStr = typeof reason === "string" ? reason : (reason?.message || "Kutilmagan xatolik yuz berdi");
    console.error("Global unhandledrejection:", errorStr);
  };
}

export function normalizeError(err, status = 500) {
  let message = "Xatolik yuz berdi";
  let code = status;

  if (typeof err === "string") {
    message = err;
  } else if (err && typeof err === "object") {
    if (err.code) code = err.code;

    if (typeof err.detail === "string") {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      // 422 ValidationError holatida [object Object] chiqishini oldini olish
      message = err.detail.map(d => d.msg || d.message || JSON.stringify(d)).join("; ");
    } else if (err.detail && typeof err.detail === "object") {
      message = err.detail.message || JSON.stringify(err.detail);
    } else if (typeof err.message === "string") {
      message = err.message;
    }
  }

  // Tarmoq xatolari
  if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("networkerror")) {
    message = "Tarmoq xatosi: server bilan aloqa mavjud emas";
    code = "NETWORK_ERROR";
  }

  return { code, message: String(message) };
}

export async function apiRequest(endpoint, options = {}) {
  const initData = getInitData();
  const headers = {
    Authorization: `tma ${initData}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  try {
    const response = await fetch(endpoint, { ...options, headers });

    if (response.status === 204) {
      return null;
    }

    let body = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      body = await response.json().catch(() => null);
    }

    if (!response.ok) {
      const normalized = normalizeError(body, response.status);
      const error = new Error(normalized.message);
      error.code = normalized.code;
      error.status = response.status;
      throw error;
    }

    return body;
  } catch (err) {
    const normalized = normalizeError(err, err.status || 500);
    haptic.notification("error");
    const error = new Error(normalized.message);
    error.code = normalized.code;
    throw error;
  }
}
