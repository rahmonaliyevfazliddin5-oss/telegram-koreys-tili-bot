export function StatCard({ status }) {
  if (!status) return null;

  const isWeekend = status.is_weekend || status.is_rest_day;
  const l1 = status.lesson_1;
  const l2 = status.lesson_2;

  let text = "Hozir dars oynasi yopiq";
  let badgeType = "closed";

  if (isWeekend) {
    text = "Bugun dam olish kuni";
    badgeType = "weekend";
  } else if (l1?.is_open) {
    text = "Dars oynasi ochiq: 07:00 - 12:00";
    badgeType = "open";
  } else if (l2?.is_open) {
    text = "Dars oynasi ochiq: 15:30 - 20:00";
    badgeType = "open";
  }

  return (
    <div class={`stat-card stat-${badgeType}`}>
      <div class="stat-indicator-dot" />
      <span class="stat-text">{text}</span>
    </div>
  );
}
