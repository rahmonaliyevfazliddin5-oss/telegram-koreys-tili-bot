let serverTimeOffsetMs = 0;
let lastServerDateStr = "";

export function syncServerClock(serverStatus) {
  if (!serverStatus) return;
  const { date, current_time } = serverStatus;
  lastServerDateStr = date;

  if (date && current_time) {
    const [h, m, s] = current_time.split(":").map(Number);
    const [year, month, day] = date.split("-").map(Number);
    // Tashkent is UTC+5
    const serverDate = new Date(Date.UTC(year, month - 1, day, (h || 0) - 5, m || 0, s || 0));
    const now = new Date();
    serverTimeOffsetMs = serverDate.getTime() - now.getTime();
  }
}

export function getCurrentServerDate() {
  const now = new Date(Date.now() + serverTimeOffsetMs);
  // Convert to Tashkent date (UTC+5)
  const tzDate = new Date(now.getTime() + 5 * 3600 * 1000);
  const y = tzDate.getUTCFullYear();
  const m = String(tzDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tzDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCurrentServerTime() {
  const now = new Date(Date.now() + serverTimeOffsetMs);
  const tzDate = new Date(now.getTime() + 5 * 3600 * 1000);
  const h = String(tzDate.getUTCHours()).padStart(2, "0");
  const m = String(tzDate.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
