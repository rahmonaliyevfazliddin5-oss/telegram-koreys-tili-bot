import { closeApp } from "../lib/tg.js";

export function Denied() {
  return (
    <div class="special-screen-page">
      <div class="special-screen-icon" style={{ background: "#F3F4F6", color: "var(--muted)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      </div>

      <h2 class="special-screen-title">Kirish taqiqlangan</h2>

      <p class="special-screen-desc">
        Sizda admin paneliga kirish huquqi yo'q yoki avtorizatsiya sessiyasi yakunlangan.
      </p>

      <button
        type="button"
        class="filter-chip"
        style={{ marginTop: "16px", height: "40px", padding: "0 24px" }}
        onClick={closeApp}
      >
        Telegram botga qaytish
      </button>
    </div>
  );
}
