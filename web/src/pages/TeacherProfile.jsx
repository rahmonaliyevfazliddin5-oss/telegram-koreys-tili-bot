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
              <span class="teacher-stat-val">{profileData.lessons_count || 0}</span>
            </div>

            <div class="teacher-stat-box">
              <span class="teacher-stat-label">O'tkazilgan imtihonlar</span>
              <span class="teacher-stat-val">{profileData.exams_count || 0}</span>
            </div>
          </div>

          {/* Oylik ish kunlari (Du-Ju) taqvimi (B16: Shanba/yakshanba ko'rsatilmaydi) */}
          <div class="home-section-header">
            <h3>Oylik ish kunlari</h3>
          </div>

          <div class="teacher-calendar-list">
            {profileData.workdays && profileData.workdays.length > 0 ? (
              profileData.workdays.map((day) => (
                <div key={day.date} class="teacher-calendar-day">
                  <div class="calendar-day-header">
                    <span>{day.date} ({day.weekday_name})</span>
                  </div>

                  <div class="calendar-lessons-info">
                    {day.lesson_1?.topic ? (
                      <div class="calendar-lesson-line">
                        <span class="calendar-lesson-tag">1-dars:</span>
                        <span>{day.lesson_1.topic}</span>
                      </div>
                    ) : (
                      <div class="calendar-lesson-line" style={{ color: "var(--muted)" }}>
                        <span>1-dars: mavzu kiritilmagan</span>
                      </div>
                    )}

                    {day.lesson_2?.topic ? (
                      <div class="calendar-lesson-line">
                        <span class="calendar-lesson-tag">2-dars:</span>
                        <span>{day.lesson_2.topic}</span>
                      </div>
                    ) : (
                      <div class="calendar-lesson-line" style={{ color: "var(--muted)" }}>
                        <span>2-dars: mavzu kiritilmagan</span>
                      </div>
                    )}

                    {day.exams && day.exams.length > 0 && (
                      <div class="calendar-lesson-line" style={{ color: "var(--brand)" }}>
                        <span style={{ fontWeight: "600" }}>Imtihon:</span>
                        <span>{day.exams.map((e) => e.name).join(", ")}</span>
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
