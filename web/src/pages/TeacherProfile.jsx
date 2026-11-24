import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { MONTH_NAMES_UZ } from "../lib/format.js";
import { MonthSheet } from "../components/MonthSheet.jsx";
import { Sheet } from "../components/Sheet.jsx";

export function TeacherProfile() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState("attended");

  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest(`/api/teacher/profile?month=${monthStr}`);
      setProfileData(data);
    } catch (err) {
      showToast(err.message || "O'qituvchi ma'lumotlarini yuklashda xatolik", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [selectedYear, selectedMonth]);

  const monthName = MONTH_NAMES_UZ[selectedMonth - 1] || "";

  return (
    <div class="teacher-profile-page">
      {/* Sarlavha va oy tanlash */}
      <div class="grading-header-row">
        <h2 class="home-title" style={{ margin: 0 }}>O'qituvchi profili</h2>
        <button
          type="button"
          class="month-picker-btn"
          onClick={() => setMonthSheetOpen(true)}
        >
          <span>{monthName} {selectedYear}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
          Yuklanmoqda...
        </div>
      ) : !profileData ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
          Ma'lumotlar topilmadi
        </div>
      ) : (
        <>
          {/* 2 ta statistika kartasi (B16) */}
          <div class="teacher-stats-row">
            <div class="teacher-stat-box">
              <span class="teacher-stat-label">O'tgan darslar</span>
              <span class="teacher-stat-val">{profileData.total_lessons || profileData.lessons_count || 0}</span>
            </div>

            <div class="teacher-stat-box">
              <span class="teacher-stat-label">O'tkazilgan imtihonlar</span>
              <span class="teacher-stat-val">{profileData.total_exams || profileData.exams_count || 0}</span>
            </div>
          </div>

          {/* Oylik ish kunlari (Du-Ju) taqvimi */}
          <div class="home-section-header">
            <h3>O'tilgan darslar</h3>
          </div>

          <div class="teacher-calendar-list">
            {profileData.workdays && profileData.workdays.length > 0 ? (
              profileData.workdays.map((day) => (
                <div key={day.date} class="teacher-calendar-day" style={{ padding: "12px", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "10px" }}>
                  <div class="calendar-day-header" style={{ fontWeight: "700", marginBottom: "8px" }}>
                    <span>{day.date_formatted || day.date}</span>
                  </div>

                  <div class="calendar-lessons-info" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {day.lessons && day.lessons.length > 0 ? (
                      day.lessons.map((l) => (
                        <div
                          key={l.lesson_no}
                          onClick={() => {
                            setSelectedLesson({
                              ...l,
                              date_formatted: day.date_formatted || day.date,
                              date: day.date
                            });
                            setActiveDetailTab("attended");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "rgba(0,0,0,0.02)",
                            border: "1px solid rgba(0,0,0,0.06)",
                            cursor: "pointer",
                            transition: "background 0.15s ease"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                              <span class="calendar-lesson-tag" style={{ fontWeight: "600", color: "var(--brand)" }}>
                                {l.lesson_no}-dars ({l.time}):
                              </span>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
                                {l.topic}
                              </span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style={{ color: "var(--muted)", marginLeft: "8px", flexShrink: 0 }}>
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                            <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", fontWeight: "600" }}>
                              Qatnashdi: {l.attended_count}
                            </span>
                            <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: "600" }}>
                              Baholandi: {l.graded_count}
                            </span>
                            <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(220, 38, 38, 0.12)", color: "#dc2626", fontWeight: "600" }}>
                              Dars qoldirdi: {l.absent_count}
                            </span>
                          </div>

                          {l.homework && (
                            <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--text)" }}>
                              <span style={{ color: "var(--muted)" }}>Uy ishi: </span>
                              <span>{l.homework}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div class="calendar-lesson-line" style={{ color: "var(--muted)", fontSize: "13px" }}>
                        <span>Dars o'tilmagan</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                Shu oyda dars yozuvlari mavjud emas
              </div>
            )}
          </div>

          {/* O'tkazilgan imtihonlar bo'limi */}
          {profileData.exams && profileData.exams.length > 0 && (
            <>
              <div class="home-section-header" style={{ marginTop: "20px" }}>
                <h3>O'tkazilgan imtihonlar</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "80px" }}>
                {profileData.exams.map((exam) => (
                  <div key={exam.id} style={{ padding: "12px", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px" }}>{exam.name}</span>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{exam.date_formatted}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text)", marginTop: "4px" }}>
                      {exam.topic}
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", fontWeight: "600" }}>
                        Qatnashdi: {exam.attended_count}
                      </span>
                      {exam.avg_score !== null && (
                        <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: "600" }}>
                          O'rtacha ball: {exam.avg_score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Dars tafsiloti Sheet (Har bir darsni bosganda) */}
      <Sheet
        isOpen={Boolean(selectedLesson)}
        onClose={() => setSelectedLesson(null)}
        maxHeight="85vh"
      >
        {selectedLesson && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "0 4px 20px 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text)", margin: "0 0 4px 0" }}>
                  {selectedLesson.lesson_no}-dars ({selectedLesson.time})
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>
                  {selectedLesson.date_formatted}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLesson(null)}
                style={{
                  background: "rgba(0,0,0,0.05)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text)"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ background: "rgba(0,0,0,0.03)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Dars mavzusi
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", marginTop: "2px" }}>
                {selectedLesson.topic}
              </div>
              {selectedLesson.homework && (
                <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed rgba(0,0,0,0.08)" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>Uy ishi: </span>
                  <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--text)" }}>{selectedLesson.homework}</span>
                </div>
              )}
            </div>

            {/* 3 ta tab tugmasi */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setActiveDetailTab("attended")}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  border: activeDetailTab === "attended" ? "2px solid #16a34a" : "1px solid var(--border)",
                  background: activeDetailTab === "attended" ? "rgba(34, 197, 94, 0.12)" : "var(--surface)",
                  color: activeDetailTab === "attended" ? "#16a34a" : "var(--text)",
                  fontWeight: "700",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div>Qatnashdi</div>
                <div style={{ fontSize: "14px", marginTop: "2px" }}>{selectedLesson.attended_students?.length || 0}</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("graded")}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  border: activeDetailTab === "graded" ? "2px solid #2563eb" : "1px solid var(--border)",
                  background: activeDetailTab === "graded" ? "rgba(59, 130, 246, 0.12)" : "var(--surface)",
                  color: activeDetailTab === "graded" ? "#2563eb" : "var(--text)",
                  fontWeight: "700",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div>Baholandi</div>
                <div style={{ fontSize: "14px", marginTop: "2px" }}>{selectedLesson.graded_students?.length || 0}</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("absent")}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  border: activeDetailTab === "absent" ? "2px solid #dc2626" : "1px solid var(--border)",
                  background: activeDetailTab === "absent" ? "rgba(220, 38, 38, 0.12)" : "var(--surface)",
                  color: activeDetailTab === "absent" ? "#dc2626" : "var(--text)",
                  fontWeight: "700",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div>Qoldirdi</div>
                <div style={{ fontSize: "14px", marginTop: "2px" }}>{selectedLesson.absent_students?.length || 0}</div>
              </button>
            </div>

            {/* O'quvchilar ro'yxati */}
            <div style={{ maxHeight: "38vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              {activeDetailTab === "attended" && (
                selectedLesson.attended_students && selectedLesson.attended_students.length > 0 ? (
                  selectedLesson.attended_students.map((st, i) => (
                    <div key={st.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>{i + 1}. {st.name}</span>
                      <span style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        background: st.status === "late" ? "rgba(234, 179, 8, 0.15)" : "rgba(34, 197, 94, 0.12)",
                        color: st.status === "late" ? "#b45309" : "#16a34a"
                      }}>
                        {st.status === "late" ? `Kech (+${st.late_minutes || 0}m)` : "Keldi"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "13px" }}>
                    Qatnashgan o'quvchilar yo'q
                  </div>
                )
              )}

              {activeDetailTab === "graded" && (
                selectedLesson.graded_students && selectedLesson.graded_students.length > 0 ? (
                  selectedLesson.graded_students.map((st, i) => (
                    <div key={st.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>{i + 1}. {st.name}</span>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: "rgba(59, 130, 246, 0.12)",
                        color: "#2563eb"
                      }}>
                        {st.value}{st.modifier === "plus" ? "+" : st.modifier === "minus" ? "-" : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "13px" }}>
                    Baholangan o'quvchilar yo'q
                  </div>
                )
              )}

              {activeDetailTab === "absent" && (
                selectedLesson.absent_students && selectedLesson.absent_students.length > 0 ? (
                  selectedLesson.absent_students.map((st, i) => (
                    <div key={st.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>{i + 1}. {st.name}</span>
                      <span style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        background: "rgba(220, 38, 38, 0.12)",
                        color: "#dc2626"
                      }}>
                        Dars qoldirdi
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "13px" }}>
                    Dars qoldirgan o'quvchilar yo'q
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* Oy tanlash Sheet */}
      <MonthSheet
        isOpen={monthSheetOpen}
        onClose={() => setMonthSheetOpen(false)}
        currentYear={selectedYear}
        selectedMonth={selectedMonth}
        onSelectMonth={(mNum, yNum) => {
          setSelectedMonth(mNum);
          setSelectedYear(yNum);
        }}
      />
    </div>
  );
}
