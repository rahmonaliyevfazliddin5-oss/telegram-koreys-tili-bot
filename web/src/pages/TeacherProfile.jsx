import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { MONTH_NAMES_UZ } from "../lib/format.js";
import { MonthSheet } from "../components/MonthSheet.jsx";

export function TeacherProfile() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);

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
                        <div key={l.lesson_no} style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span class="calendar-lesson-tag" style={{ fontWeight: "600", color: "var(--brand)" }}>
                              {l.lesson_no}-dars ({l.time}):
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: "600", flex: 1, marginLeft: "8px" }}>
                              {l.topic}
                            </span>
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
