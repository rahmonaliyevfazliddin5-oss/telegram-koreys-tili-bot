import { useMemo } from "preact/hooks";
import { WEEKDAYS_SHORT } from "../lib/format.js";

export function WeekStrip({
  selectedDate,
  todayDate,
  onSelectDate
}) {
  // Tanlangan sana yoki bugungi sanaga asosan hafta kunlarini hisoblash
  const weekDays = useMemo(() => {
    const baseDate = selectedDate ? new Date(selectedDate) : todayDate ? new Date(todayDate) : new Date();
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    
    // Dushanba kuniga siljitish
    // Agar Yakshanba (0) bo'lsa -6 kun, Shanba (6) bo'lsa -5 kun, boshqa kunlarda 1 - dayOfWeek
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 5; i++) { // Du, Se, Chor, Pay, Ju (5 ish kuni)
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dayName: WEEKDAYS_SHORT[i],
        dayNum: day,
        dateStr,
        isToday: dateStr === todayDate,
        isSelected: dateStr === selectedDate
      });
    }
    return days;
  }, [selectedDate, todayDate]);

  return (
    <div class="week-strip-container">
      {weekDays.map((item) => (
        <button
          key={item.dateStr}
          type="button"
          class={`week-strip-day ${item.isSelected ? "selected" : ""} ${item.isToday ? "today" : ""}`}
          onClick={() => onSelectDate(item.dateStr)}
        >
          <span class="strip-day-name">{item.dayName}</span>
          <span class="strip-day-num">{item.dayNum}</span>
          {item.isToday && <span class="strip-today-dot" />}
        </button>
      ))}
    </div>
  );
}
