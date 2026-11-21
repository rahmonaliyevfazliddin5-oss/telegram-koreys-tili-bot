import { Sheet } from "./Sheet.jsx";
import { MONTH_NAMES_UZ } from "../lib/format.js";

export function MonthSheet({
  isOpen,
  onClose,
  currentYear = 2026,
  selectedMonth = 11,
  onSelectMonth
}) {
  const months = MONTH_NAMES_UZ.map((name, idx) => ({
    name,
    monthNum: idx + 1,
    formatted: `${name} ${currentYear}`
  }));

  const handleMonthClick = (monthNum) => {
    onSelectMonth(monthNum, currentYear);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Oyni tanlang">
      <div class="month-sheet-list">
        {months.map((m) => (
          <button
            key={m.monthNum}
            type="button"
            class={`month-sheet-item ${m.monthNum === selectedMonth ? "selected" : ""}`}
            onClick={() => handleMonthClick(m.monthNum)}
          >
            <span>{m.formatted}</span>
            {m.monthNum === selectedMonth && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
