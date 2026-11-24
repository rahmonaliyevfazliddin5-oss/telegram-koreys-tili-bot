import { useState } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { SaveDock } from "../components/SaveDock.jsx";

export function ExamForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [examDate, setExamDate] = useState(today);
  const [lessonNo, setLessonNo] = useState(1);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const cleanName = name.trim();
    const cleanTopic = topic.trim();

    if (!cleanName) {
      showToast("Imtihon nomini kiriting", "warn");
      return;
    }

    if (!cleanTopic) {
      showToast("Imtihon mavzusini kiriting", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: examDate || today,
        lesson_no: Number(lessonNo) || 1,
        name: cleanName,
        topic: cleanTopic
      };
      await apiRequest("/api/exams", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Imtihon ochildi", "success");
      navigate("exam-list");
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="student-form-page">
      <h2 class="home-title">Yangi imtihon</h2>

      <form class="form-card" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label">Sana</label>
          <input
            type="date"
            class="form-input"
            value={examDate}
            onInput={(e) => setExamDate(e.target.value)}
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Dars</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              class={`filter-chip ${lessonNo === 1 ? "active" : ""}`}
              onClick={() => setLessonNo(1)}
              style={{ flex: 1, height: "42px", justifyContent: "center" }}
            >
              1-dars
            </button>
            <button
              type="button"
              class={`filter-chip ${lessonNo === 2 ? "active" : ""}`}
              onClick={() => setLessonNo(2)}
              style={{ flex: 1, height: "42px", justifyContent: "center" }}
            >
              2-dars
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Imtihon nomi *</label>
          <input
            type="text"
            class="form-input"
            placeholder="Masalan: 1-oraliq nazorat"
            value={name}
            onInput={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div class="form-group">
          <label class="form-label">Mavzu / tavsif *</label>
          <input
            type="text"
            class="form-input"
            placeholder="Masalan: 1-4 boblar bo'yicha test"
            value={topic}
            onInput={(e) => setTopic(e.target.value)}
            required
          />
        </div>
      </form>

      <SaveDock
        visible={true}
        disabled={!name.trim() || !topic.trim()}
        loading={isSubmitting}
        text="Saqlash"
        onSave={handleSubmit}
      />
    </div>
  );
}
