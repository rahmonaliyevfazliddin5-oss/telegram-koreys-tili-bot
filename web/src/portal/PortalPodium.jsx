export function PortalPodium({ topStudents, onSelectStudent }) {
  if (!topStudents || topStudents.length === 0) return null;

  const first = topStudents[0];
  const second = topStudents.length > 1 ? topStudents[1] : null;
  const third = topStudents.length > 2 ? topStudents[2] : null;

  return (
    <div class="portal-podium">
      {/* 2-o'rin (Kumush) */}
      {second && (
        <div class="podium-item second" onClick={() => onSelectStudent(second)}>
          <div class="podium-rank-badge">2</div>
          <div class="podium-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            <div class="podium-name">{second.first_name} {second.last_name || ""}</div>
            <div class="podium-grade">{second.grade || "Sinf belgilanmagan"}</div>
            <div class="podium-score">{second.total_score} ball</div>
          </div>
        </div>
      )}

      {/* 1-o'rin (Oltin) */}
      {first && (
        <div class="podium-item first" onClick={() => onSelectStudent(first)}>
          <div class="podium-rank-badge">1</div>
          <div class="podium-card">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
              <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <div class="podium-name">{first.first_name} {first.last_name || ""}</div>
            <div class="podium-grade">{first.grade || "Sinf belgilanmagan"}</div>
            <div class="podium-score">{first.total_score} ball</div>
          </div>
        </div>
      )}

      {/* 3-o'rin (Bronza) */}
      {third && (
        <div class="podium-item third" onClick={() => onSelectStudent(third)}>
          <div class="podium-rank-badge">3</div>
          <div class="podium-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            <div class="podium-name">{third.first_name} {third.last_name || ""}</div>
            <div class="podium-grade">{third.grade || "Sinf belgilanmagan"}</div>
            <div class="podium-score">{third.total_score} ball</div>
          </div>
        </div>
      )}
    </div>
  );
}
