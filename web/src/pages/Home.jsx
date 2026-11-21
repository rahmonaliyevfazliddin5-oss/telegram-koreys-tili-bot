import { useState, useEffect } from "preact/hooks";
import { subscribeStatus, getStatus, fetchStatus } from "../store/status.js";
import { getCurrentServerTime } from "../lib/clock.js";
import { formatName } from "../lib/format.js";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { Avatar } from "../components/Avatar.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { LessonCard } from "../components/LessonCard.jsx";
import { Ring } from "../components/Ring.jsx";
import { Sheet } from "../components/Sheet.jsx";

export function Home() {
  const [status, setStatus] = useState(getStatus());
  const [clockTime, setClockTime] = useState(getCurrentServerTime());
  const [top3, setTop3] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [activeLesson, setActiveLesson] = useState(1);

  // Dars boshlash Sheet holati
  const [sheetOpen, setSheetOpen] = useState(false);
  const [startLessonNo, setStartLessonNo] = useState(1);
  const [topicInput, setTopicInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status va real-time soat obunasi
  useEffect(() => {
    const unsub = subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    const clockTimer = setInterval(() => {
      setClockTime(getCurrentServerTime());
    }, 1000);

    return () => {
      unsub();
      clearInterval(clockTimer);
    };
  }, []);

  // TOP-3 Reytingni yuklash
  useEffect(() => {
    let active = true;
    apiRequest("/api/rating?limit=3")
      .then((data) => {
        if (active && Array.isArray(data)) {
          setTop3(data.slice(0, 3));
        }
      })
      .catch((err) => {
        console.error("Top3 fetch error:", err);
      });
    return () => {
      active = false;
    };
  }, [status?.date]);

  // Bugun boshlangan darslar ro'yxati
  const l1Started = status?.lesson_1?.is_started || false;
  const l2Started = status?.lesson_2?.is_started || false;
  const availableLessons = [];
  if (l1Started) availableLessons.push(1);
  if (l2Started) availableLessons.push(2);

  // Boshlangan dars o'zgarganda activeLesson ni to'g'irlash
  useEffect(() => {
    if (availableLessons.length > 0 && !availableLessons.includes(activeLesson)) {
      setActiveLesson(availableLessons[availableLessons.length - 1]);
    }
  }, [l1Started, l2Started]);

  // Davomat ma'lumotlarini yuklash (faqat dars boshlangan bo'lsa)
  useEffect(() => {
    if (availableLessons.length === 0) {
      setAttendanceData(null);
      return;
    }

    let active = true;
    apiRequest(`/api/attendance?date=${status?.date || ""}&lesson=${activeLesson}`)
      .then((data) => {
        if (active && data) {
          setAttendanceData(data);
        }
      })
      .catch((err) => {
        console.error("Attendance fetch error:", err);
      });

    return () => {
      active = false;
    };
  }, [status?.date, activeLesson, l1Started, l2Started]);

  const handleLessonClick = (lessonNo) => {
    const isWeekend = status?.is_weekend || status?.is_rest_day;
    const lessonInfo = lessonNo === 1 ? status?.lesson_1 : status?.lesson_2;

    if (isWeekend || !lessonInfo?.is_open) {
      showToast("Dars oynasi yopiq", "info");
      return;
    }

    if (lessonInfo.is_started) {
      navigate(`grades?lesson=${lessonNo}`);
    } else {
      setStartLessonNo(lessonNo);
      setTopicInput("");
      setSheetOpen(true);
    }
  };

  const handleExamClick = () => {
    navigate("exam-list");
  };

  const handleStartLessonSubmit = async (e) => {
    e.preventDefault();
    const cleanTopic = topicInput.trim();
    if (!cleanTopic) {
      showToast("Mavzuni kiriting", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/api/lessons", {
        method: "POST",
        body: {
          lesson_no: startLessonNo,
          topic: cleanTopic
        }
      });
      showToast("Dars boshlandi", "success");
      setSheetOpen(false);
      await fetchStatus();
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="home-page">
      {/* 1. Sarlavha qatori */}
      <div class="home-header-row">
        <h2 class="home-title">Bosh sahifa</h2>
        <div class="home-header-right">
          <div class="home-clock-chip" title="Server vaqti">
            {clockTime}
          </div>
          <Avatar
            lastName="O"
            firstName="Q"
            size={36}
            onClick={() => navigate("teacher")}
            className="header-avatar"
          />
        </div>
      </div>

      {/* 2. Holat kartasi */}
      <StatCard status={status} />

      {/* 3. Bugungi darslar bloki */}
      <div class="home-section">
        <div class="home-section-header">
          <h3>Bugungi darslar</h3>
        </div>
        <div class="home-lessons-list">
          <LessonCard
            title="1-dars"
            subtitle="07:00 - 12:00"
            isOpen={!status?.is_weekend && !status?.is_rest_day && status?.lesson_1?.is_open}
            isStarted={status?.lesson_1?.is_started}
            topic={status?.lesson_1?.topic}
            onClick={() => handleLessonClick(1)}
          />

          <LessonCard
            title="2-dars"
            subtitle="15:30 - 20:00"
            isOpen={!status?.is_weekend && !status?.is_rest_day && status?.lesson_2?.is_open}
            isStarted={status?.lesson_2?.is_started}
            topic={status?.lesson_2?.topic}
            onClick={() => handleLessonClick(2)}
          />

          <LessonCard
            title="Imtihon"
            subtitle="Oraliq va yakuniy testlar"
            isExam={true}
            examCount={status?.exams ? status.exams.length : 0}
            isOpen={true}
            onClick={handleExamClick}
          />
        </div>
      </div>

      {/* 4. Davomat halqasi (Faqat bugun dars boshlangan bo'lsa) */}
      {availableLessons.length > 0 && attendanceData && (
        <div class="home-section">
          <Ring
            present={attendanceData.present_count || 0}
            absent={attendanceData.absent_count || 0}
            total={attendanceData.total_students || 0}
            lessonNo={activeLesson}
            availableLessons={availableLessons}
            onLessonChange={setActiveLesson}
          />
        </div>
      )}

      {/* 5. TOP-3 Reyting */}
      <div class="home-section">
        <div class="home-section-header">
          <h3>Reyting</h3>
          <button
            type="button"
            class="btn-link"
            onClick={() => navigate("students?tab=rating")}
          >
            Hammasi
          </button>
        </div>

        <div class="top3-card">
          {top3.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted)", fontSize: "13px" }}>
              Hozircha reyting ma'lumotlari mavjud emas
            </div>
          ) : (
            <div class="top3-list">
              {top3.map((student, idx) => (
                <div
                  key={student.id}
                  class="top3-row"
                  onClick={() => navigate(`student-profile/${student.id}`)}
                >
                  <div class="top3-left">
                    <span class={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                    <Avatar
                      lastName={student.last_name}
                      firstName={student.first_name}
                      size={32}
                    />
                    <div class="top3-name-wrap">
                      <span class="top3-name">
                        {formatName(student.last_name, student.first_name)}
                      </span>
                    </div>
                  </div>
                  <span class="top3-score-chip">
                    {student.total_score} ball
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Manbalar qatori */}
      <div class="home-section" style={{ marginBottom: "16px" }}>
        <div class="home-sources-row" onClick={() => navigate("sources")}>
          <div class="home-sources-left">
            <div class="sources-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <span class="home-sources-title">O'quv manbalari</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ color: "var(--muted)" }}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>

      {/* Dars boshlash Sheet */}
      <Sheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`${startLessonNo}-dars mavzusi`}
      >
        <form class="start-lesson-form" onSubmit={handleStartLessonSubmit}>
          <input
            type="text"
            placeholder="Mavzuni kiriting"
            value={topicInput}
            onInput={(e) => setTopicInput(e.target.value)}
            autoFocus
            required
          />
          <button
            type="submit"
            class="start-lesson-btn"
            disabled={isSubmitting || !topicInput.trim()}
          >
            {isSubmitting ? "Boshlanmoqda..." : "Darsni boshlash"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
