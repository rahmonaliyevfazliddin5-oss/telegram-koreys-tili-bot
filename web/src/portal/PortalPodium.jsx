export function PortalPodium({ topStudents, onSelectStudent }) {
  if (!topStudents || topStudents.length === 0) return null;

  const medals = [
    { rank: 1, label: "1-o'rin", color: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D" },
    { rank: 2, label: "2-o'rin", color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1" },
    { rank: 3, label: "3-o'rin", color: "#B45309", bg: "#FFEDD5", border: "#FDBA74" }
  ];

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: "16px",
      padding: "14px 16px",
      marginBottom: "14px",
      border: "1px solid #F3E8E9",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px",
        paddingBottom: "8px",
        borderBottom: "1px solid #F3E8E9"
      }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#1F1F2E", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Yetakchilar (Top 3)
        </div>
        <div style={{ fontSize: "11px", color: "#6B7280" }}>
          Jami ballar
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {topStudents.map((st, idx) => {
          const medal = medals[idx] || medals[2];
          return (
            <div
              key={st.id}
              onClick={() => onSelectStudent(st)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "10px",
                background: medal.bg,
                border: `1px solid ${medal.border}`,
                cursor: "pointer",
                transition: "transform 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: medal.color,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "800",
                  flexShrink: 0
                }}>
                  {st.rank || idx + 1}
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1F1F2E",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {st.first_name} {st.last_name || ""}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280" }}>
                    {st.grade || "Sinf belgilanmagan"}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: "13px",
                fontWeight: "800",
                color: medal.color,
                marginLeft: "8px",
                flexShrink: 0
              }}>
                {st.total_score} ball
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
