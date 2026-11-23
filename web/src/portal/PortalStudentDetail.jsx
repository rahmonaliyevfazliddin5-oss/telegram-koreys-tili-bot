import { useState, useEffect } from "preact/hooks";
import { fetchPortalStudentDetail } from "./portalApi.js";

export function PortalStudentDetail({ studentId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, grades, notes

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetchPortalStudentDetail(studentId)
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Ma'lumotlarni yuklab bo'lmadi");
        setLoading(false);
      });
  }, [studentId]);

  if (!studentId) return null;

  return (
    <div class="portal-modal-overlay" onClick={onClose}>
      <div class="portal-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div class="portal-modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#FFFFFF", fontWeight: "700" }}>
              {detail ? `${detail.first_name} ${detail.last_name || ""}` : "O'quvchi ma'lumotlari"}
            </h3>
            {detail && (
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                {detail.grade || "Sinf belgilanmagan"}
              </span>
            )}
          </div>
          <button class="portal-close-btn" onClick={onClose} aria-label="Yopish">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div class="portal-modal-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
              Ma'lumotlar yuklanmoqda...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#EF4444" }}>
              {error}
            </div>
          ) : detail ? (
            <div>
              {/* Stat Cards Grid */}
              <div class="portal-stat-grid">
                <div class="portal-stat-box">
                  <div class="portal-stat-num" style={{ color: "#F59E0B" }}>
                    #{detail.rank || "-"}
                  </div>
                  <div class="portal-stat-label">Reyting o'rni</div>
                </div>
                <div class="portal-stat-box">
                  <div class="portal-stat-num" style={{ color: "#10B981" }}>
                    {detail.total_score}
                  </div>
                  <div class="portal-stat-label">Jami ball</div>
                </div>
                <div class="portal-stat-box">
                  <div class="portal-stat-num" style={{ color: detail.absences_count > 0 ? "#EF4444" : "#94A3B8" }}>
                    {detail.absences_count}
                  </div>
                  <div class="portal-stat-label">Dars qoldirgan</div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div class="portal-chips-row" style={{ marginTop: "12px" }}>
                <button
                  class={`portal-chip ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  Baho va imtihonlar
                </button>
                <button
                  class={`portal-chip ${activeTab === "notes" ? "active" : ""}`}
                  onClick={() => setActiveTab("notes")}
                >
                  O'qituvchi izohlari ({detail.teacher_notes?.length || 0})
                </button>
              </div>

              {/* Overview Tab: Grades & Exams */}
              {activeTab === "overview" && (
                <div>
                  <h4 style={{ margin: "14px 0 8px", fontSize: "13px", color: "#94A3B8", textTransform: "uppercase" }}>
                    Dars baholari (Darsdagi faollik)
                  </h4>
                  {(!detail.recent_grades || detail.recent_grades.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#64748B", padding: "8px 0" }}>
                      Hali dars baholari mavjud emas
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
                      {detail.recent_grades.map((g, idx) => (
                        <div key={idx} style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          padding: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "11px", color: "#94A3B8" }}>{g.date}</div>
                            <div style={{ fontSize: "10px", color: "#64748B" }}>{g.lesson_no}-dars</div>
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#F59E0B" }}>
                            +{g.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <h4 style={{ margin: "18px 0 8px", fontSize: "13px", color: "#94A3B8", textTransform: "uppercase" }}>
                    Imtihon natijalari
                  </h4>
                  {(!detail.recent_exams || detail.recent_exams.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#64748B", padding: "8px 0" }}>
                      Hali imtihon baholari yo'q
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {detail.recent_exams.map((ex, idx) => (
                        <div key={idx} style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#FFFFFF" }}>{ex.name}</div>
                            <div style={{ fontSize: "11px", color: "#64748B" }}>{ex.date}</div>
                          </div>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "#10B981" }}>
                            {ex.score} ball
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes Tab: Teacher Notes & Homework */}
              {activeTab === "notes" && (
                <div>
                  <h4 style={{ margin: "14px 0 8px", fontSize: "13px", color: "#94A3B8", textTransform: "uppercase" }}>
                    O'qituvchi eslatmalari va uy ishlari
                  </h4>
                  {(!detail.teacher_notes || detail.teacher_notes.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#64748B", padding: "16px 0", textAlign: "center" }}>
                      Hozircha o'qituvchi tomonidan kiritilgan uy ishlari yoki izohlar yo'q
                    </div>
                  ) : (
                    <div>
                      {detail.teacher_notes.map((note, idx) => (
                        <div key={idx} class="portal-note-box">
                          <div class="portal-note-meta">
                            {note.date} - {note.lesson_no}-dars {note.topic ? `(${note.topic})` : ""}
                          </div>
                          <div class="portal-note-text">
                            {note.homework}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
