import { useState, useEffect } from "preact/hooks";
import { fetchPortalStudentDetail } from "./portalApi.js";

export function PortalStudentDetail({ studentId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, notes

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
    <div class="modal-overlay" onClick={onClose} style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.45)",
      backdropFilter: "blur(4px)",
      zIndex: 100,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    }}>
      <div
        class="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "500px",
          maxHeight: "85vh",
          background: "#FFFFFF",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #F3E8E9"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#1F1F2E", fontWeight: "700" }}>
              {detail ? `${detail.first_name} ${detail.last_name || ""}` : "O'quvchi ma'lumotlari"}
            </h3>
            {detail && (
              <span style={{ fontSize: "12px", color: "#E4002B", fontWeight: "600" }}>
                {detail.grade || "Sinf belgilanmagan"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            style={{
              background: "#F3E8E9",
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              color: "#1F1F2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6B7280" }}>
              Ma'lumotlar yuklanmoqda...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#E4002B" }}>
              {error}
            </div>
          ) : detail ? (
            <div>
              {/* Stat Cards Grid (4 asosiy ko'rsatkich) */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
                marginBottom: "16px"
              }}>
                <div style={{
                  background: "#FFF7F8",
                  border: "1px solid #F3E8E9",
                  borderRadius: "12px",
                  padding: "12px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#E4002B" }}>
                    {detail.total_score} ball
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    Umumiy ball ({detail.rank ? `#${detail.rank}-o'rin` : "-"})
                  </div>
                </div>

                <div style={{
                  background: "#F0FDF4",
                  border: "1px solid #DCFCE7",
                  borderRadius: "12px",
                  padding: "12px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#16A34A" }}>
                    {detail.attended_lessons_count || 0} / {detail.total_teacher_lessons || 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    Darsda qatnashdi / Jami
                  </div>
                </div>

                <div style={{
                  background: detail.absences_count > 0 ? "#FEF2F2" : "#F9FAFB",
                  border: `1px solid ${detail.absences_count > 0 ? "#FEE2E2" : "#F3F4F6"}`,
                  borderRadius: "12px",
                  padding: "12px",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: "18px",
                    fontWeight: "800",
                    color: detail.absences_count > 0 ? "#DC2626" : "#4B5563"
                  }}>
                    {detail.absences_count} ta
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    Dars qoldirgan soni
                  </div>
                </div>

                <div style={{
                  background: detail.lates_count > 0 ? "#FFFBEB" : "#F9FAFB",
                  border: `1px solid ${detail.lates_count > 0 ? "#FEF3C7" : "#F3F4F6"}`,
                  borderRadius: "12px",
                  padding: "12px",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: "18px",
                    fontWeight: "800",
                    color: detail.lates_count > 0 ? "#D97706" : "#4B5563"
                  }}>
                    {detail.lates_count} ta
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    Kech qolgan soni
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <button
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: "700",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === "overview" ? "#E4002B" : "#F3E8E9",
                    color: activeTab === "overview" ? "#FFFFFF" : "#6B7280"
                  }}
                  onClick={() => setActiveTab("overview")}
                >
                  Baholar va Imtihonlar
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: "700",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === "notes" ? "#E4002B" : "#F3E8E9",
                    color: activeTab === "notes" ? "#FFFFFF" : "#6B7280"
                  }}
                  onClick={() => setActiveTab("notes")}
                >
                  O'qituvchi izohlari ({detail.teacher_notes?.length || 0})
                </button>
              </div>

              {/* Tab 1: Grades & Exams */}
              {activeTab === "overview" && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>
                    Dars baholari (faollik)
                  </div>
                  {(!detail.recent_grades || detail.recent_grades.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#9CA3AF", padding: "8px 0" }}>
                      Hozircha dars baholari mavjud emas
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                      {detail.recent_grades.map((g, idx) => (
                        <div key={idx} style={{
                          background: "#F9FAFB",
                          border: "1px solid #F3F4F6",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{g.date}</div>
                            <div style={{ fontSize: "10px", color: "#9CA3AF" }}>{g.lesson_no}-dars</div>
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: "#E4002B" }}>
                            +{g.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", marginTop: "16px", marginBottom: "8px" }}>
                    Imtihon baholari
                  </div>
                  {(!detail.recent_exams || detail.recent_exams.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#9CA3AF", padding: "8px 0" }}>
                      Hozircha imtihon baholari yo'q
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {detail.recent_exams.map((ex, idx) => (
                        <div key={idx} style={{
                          background: "#F9FAFB",
                          border: "1px solid #F3F4F6",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#1F1F2E" }}>{ex.name}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{ex.date}</div>
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: "#16A34A" }}>
                            {ex.score} ball
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Notes & Homework */}
              {activeTab === "notes" && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>
                    Dars bo'yicha uy ishlari va eslatmalar
                  </div>
                  {(!detail.teacher_notes || detail.teacher_notes.length === 0) ? (
                    <div style={{ fontSize: "12px", color: "#9CA3AF", padding: "16px 0", textAlign: "center" }}>
                      Hozircha o'qituvchi tomonidan kiritilgan uy ishlari yoki izohlar yo'q
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {detail.teacher_notes.map((note, idx) => (
                        <div key={idx} style={{
                          background: "#FFF7F8",
                          borderLeft: "3px solid #E4002B",
                          borderRadius: "8px",
                          padding: "10px 12px"
                        }}>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#E4002B", marginBottom: "4px" }}>
                            {note.date} - {note.lesson_no}-dars {note.topic ? `(${note.topic})` : ""}
                          </div>
                          <div style={{ fontSize: "13px", color: "#1F1F2E", lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
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
