import { useState, useEffect } from "preact/hooks";
import { getStatus, fetchStatus } from "../store/status.js";
import { closeApp } from "../lib/tg.js";

export function Blocked() {
  const status = getStatus();
  const [secondsLeft, setSecondsLeft] = useState(status?.block_ttl || 1800);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div class="special-screen-page">
      <div class="special-screen-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>

      <h2 class="special-screen-title">Tizim vaqtincha bloklangan</h2>

      <p class="special-screen-desc">
        Admin paroli 3 marta noto'g'ri kiritilgani sababli kirish 30 daqiqaga cheklangan.
      </p>

      <div class="special-countdown">
        {formatCountdown(secondsLeft)}
      </div>

      <button
        type="button"
        class="filter-chip"
        style={{ marginTop: "16px", height: "40px", padding: "0 24px" }}
        onClick={closeApp}
      >
        Ilovani yopish
      </button>
    </div>
  );
}
