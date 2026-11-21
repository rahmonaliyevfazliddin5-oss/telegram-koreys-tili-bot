import { useState } from "preact/hooks";
import { haptic } from "../lib/tg.js";

export function SaveDock({ onSave, disabled = false, isClosed = false, label = "Saqlash" }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || disabled || isClosed) return;
    setLoading(true);
    haptic.impact("medium");
    try {
      await onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="save-dock" id="globalSaveContainer">
      <button
        type="button"
        id="btnGlobalSaveAction"
        class={`save-dock-btn ${isClosed ? "is-closed" : ""}`}
        disabled={disabled || loading || isClosed}
        onClick={handleClick}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>{loading ? "Saqlanmoqda..." : label}</span>
      </button>
    </div>
  );
}
