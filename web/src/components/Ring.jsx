export function Ring({
  present = 0,
  absent = 0,
  total = 0,
  lessonNo = 1,
  availableLessons = [1],
  onLessonChange
}) {
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div class="ring-card">
      <div class="ring-card-header">
        <h3>Davomat</h3>
        {availableLessons.length > 1 && (
          <div class="ring-tab-pills">
            {availableLessons.map((lNum) => (
              <button
                key={lNum}
                type="button"
                class={`ring-tab-pill ${lessonNo === lNum ? "active" : ""}`}
                onClick={() => onLessonChange && onLessonChange(lNum)}
              >
                {lNum}-dars
              </button>
            ))}
          </div>
        )}
      </div>

      <div class="ring-card-body">
        <div class="ring-svg-wrap">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="#F3E8E9"
              stroke-width="8"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="var(--brand)"
              stroke-width="8"
              stroke-dasharray={circumference}
              stroke-dashoffset={strokeDashoffset}
              stroke-linecap="round"
              transform="rotate(-90 48 48)"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div class="ring-center-text">
            <span class="ring-percent">{percent}%</span>
          </div>
        </div>

        <div class="ring-stats-list">
          <div class="ring-stat-item">
            <span class="stat-dot dot-present" />
            <span class="stat-label">Keldi:</span>
            <span class="stat-val">{present}</span>
          </div>
          <div class="ring-stat-item">
            <span class="stat-dot dot-absent" />
            <span class="stat-label">Kelmadi:</span>
            <span class="stat-val">{absent}</span>
          </div>
          <div class="ring-stat-item">
            <span class="stat-dot dot-total" />
            <span class="stat-label">Jami:</span>
            <span class="stat-val">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
