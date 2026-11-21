import { apiRequest } from "../lib/api.js";
import { syncServerClock } from "../lib/clock.js";

let statusData = null;
const listeners = new Set();
let timerId = null;

export async function fetchStatus() {
  try {
    const data = await apiRequest("/api/status");
    statusData = data;
    syncServerClock(data);
    notify();
    return data;
  } catch (err) {
    console.error("fetchStatus error:", err);
    return null;
  }
}

export function getStatus() {
  return statusData;
}

export function subscribeStatus(callback) {
  listeners.add(callback);
  if (statusData) {
    callback(statusData);
  }
  return () => listeners.delete(callback);
}

function notify() {
  for (const cb of listeners) {
    try { cb(statusData); } catch (e) { console.error(e); }
  }
}

export function startStatusPolling() {
  if (timerId) return;
  fetchStatus();
  timerId = setInterval(fetchStatus, 30000);

  window.addEventListener("focus", () => {
    fetchStatus();
  });
}

export function stopStatusPolling() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}
