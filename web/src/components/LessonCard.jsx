export function LessonCard({
  title,
  subtitle,
  isOpen = false,
  isStarted = false,
  topic = null,
  isExam = false,
  examCount = 0,
  onClick
}) {
  let statusText = "Yopiq";
  let statusType = "closed";

  if (isExam) {
    if (examCount > 0) {
      statusText = "Boshlangan";
      statusType = "started";
    } else if (isOpen) {
      statusText = "Boshlanmagan";
      statusType = "not-started";
    } else {
      statusText = "Yopiq";
      statusType = "closed";
    }
  } else {
    if (isStarted) {
      statusText = "Boshlangan";
      statusType = "started";
    } else if (isOpen) {
      statusText = "Boshlanmagan";
      statusType = "not-started";
    } else {
      statusText = "Yopiq";
      statusType = "closed";
    }
  }

  const isClosedCard = statusType === "closed";

  return (
    <div
      class={`home-lesson-card ${isClosedCard ? "is-closed" : ""}`}
      onClick={onClick}
    >
      <div class="lesson-card-info">
        <div class="lesson-card-title">{title}</div>
        {isStarted && topic ? (
          <div class="lesson-card-topic">{topic}</div>
        ) : subtitle ? (
          <div class="lesson-card-sub">{subtitle}</div>
        ) : null}
      </div>

      <div class={`lesson-status-chip chip-${statusType}`}>
        {isClosedCard && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style={{ marginRight: "4px" }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        )}
        <span>{statusText}</span>
      </div>
    </div>
  );
}
