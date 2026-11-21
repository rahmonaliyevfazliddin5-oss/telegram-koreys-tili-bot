import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { Sheet } from "../components/Sheet.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { formatName } from "../lib/format.js";

export function ExamList() {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Imtihon baholash Sheet holati
  const [selectedExam, setSelectedExam] = useState(null);
  const [examGrades, setExamGrades] = useState([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  const loadExams = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest("/api/exams");
      if (Array.isArray(data)) {
        setExams(data);
      }
    } catch (err) {
      showToast(err.message || "Imtihonlarni yuklashda xatolik", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  // Imtihon baholarini yuklash
  const handleOpenExamGrades = async (exam) => {
    setSelectedExam(exam);
    try {
      setIsLoadingGrades(true);
      const data = await apiRequest(`/api/exams/${exam.id}/grades`);
      if (Array.isArray(data)) {
        setExamGrades(data);
      }
    } catch (err) {
      showToast(err.message || "Baholarni yuklashda xatolik", "error");
    } finally {
      setIsLoadingGrades(false);
    }
  };

  // Baho qo'yish
  const handleSetGrade = (studentId, val) => {
    setExamGrades((prev) =>
      prev.map((item) => {
        if (item.student_id === studentId) {
          const newVal = item.value === val ? null : val;
          return { ...item, value: newVal, modifier: newVal ? item.modifier : null };
        }
        return item;
      })
    );
  };

  // Baholarni saqlash
  const handleSaveGrades = async () => {
    if (!selectedExam || isSavingGrades) return;
    setIsSavingGrades(true);
    try {
      const items = examGrades.map((g) => ({
        student_id: g.student_id,
        value: g.value,
        modifier: g.modifier || null
      }));

      await apiRequest(`/api/exams/${selectedExam.id}/grades`, {
        method: "PUT",
        body: { items }
      });
      showToast("Imtihon baholari saqlandi", "success");
      setSelectedExam(null);
    } catch (err) {
      showToast(err.message || "Saqlashda xatolik yuz berdi", "error");
    } finally {
      setIsSavingGrades(false);
    }
  };

  return (
    <div class="exams-page">
      <h2 class="home-title">Imtihonlar</h2>

      {isLoading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
          Yuklanmoqda...
        </div>
      ) : exams.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
          Bugun uchun imtihonlar mavjud emas
        </div>
      ) : (
        exams.map((exam) => (
          <div
            key={exam.id}
            class="exam-card-item"
            onClick={() => handleOpenExamGrades(exam)}
          >
            <div class="exam-card-top">
              <span class="exam-card-title">{exam.name}</span>
              <span class="exam-lesson-badge">{exam.lesson_no}-dars</span>
            </div>
            <span class="exam-card-topic">{exam.topic}</span>
            <span class="exam-card-date">{exam.date}</span>
          </div>
        ))
      )}

      {/* FAB: Yangi imtihon ochish */}
      <button
        type="button"
        class="fab"
        onClick={() => navigate("exam-form")}
        title="Imtihon qo'shish"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Imtihon baholarini qo'yish Sheet */}
      <Sheet
        isOpen={Boolean(selectedExam)}
        onClose={() => setSelectedExam(null)}
        title={selectedExam?.name || "Imtihon baholari"}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingBottom: "16px" }}>
          {isLoadingGrades ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
              O'quvchilar yuklanmoqda...
            </div>
          ) : (
            examGrades.map((g) => (
              <div
                key={g.student_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-light)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar lastName={g.last_name} firstName={g.first_name} size={32} />
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>
                    {formatName(g.last_name, g.first_name || g.student_name)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      class={`btn-grade-val ${g.value === val ? "selected" : ""}`}
                      style={{ width: "34px", height: "34px", minWidth: "34px", minHeight: "34px", fontSize: "13px" }}
                      onClick={() => handleSetGrade(g.student_id, val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          class="start-lesson-btn"
          style={{ marginTop: "12px" }}
          onClick={handleSaveGrades}
          disabled={isSavingGrades}
        >
          {isSavingGrades ? "Saqlanmoqda..." : "Baholarni saqlash"}
        </button>
      </Sheet>
    </div>
  );
}
