import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { SaveDock } from "../components/SaveDock.jsx";

export function StudentForm({ id }) {
  const isEdit = Boolean(id);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [lessonSlots, setLessonSlots] = useState(null); // 1 | 2 | 3 | null
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    let active = true;
    apiRequest(`/api/students/${id}`)
      .then((data) => {
        if (active && data) {
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setGrade(data.grade || "");
          setParentPhone(data.parent_phone || "");
          setLessonSlots(data.lesson_slots || null);
        }
      })
      .catch((err) => {
        showToast(err.message || "O'quvchi ma'lumotlarini yuklashda xatolik", "error");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanGrade = grade.trim();
    const cleanPhone = parentPhone.trim();

    if (!cleanFirst) {
      showToast("Ismni kiriting", "warn");
      return;
    }

    // Yangi o'quvchida tanlash MAJBURIY!
    if (!isEdit && (lessonSlots === null || lessonSlots === undefined)) {
      showToast("Qaysi darsga qatnashishi tanlanishi shart", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await apiRequest(`/api/students/${id}`, {
          method: "PUT",
          body: {
            first_name: cleanFirst,
            last_name: cleanLast || null,
            grade: cleanGrade || null,
            parent_phone: cleanPhone || null,
            lesson_slots: lessonSlots
          }
        });
        showToast("O'quvchi yangilandi", "success");
      } else {
        await apiRequest("/api/students", {
          method: "POST",
          body: {
            first_name: cleanFirst,
            last_name: cleanLast || null,
            grade: cleanGrade || null,
            parent_phone: cleanPhone || null,
            lesson_slots: lessonSlots
          }
        });
        showToast("O'quvchi qo'shildi", "success");
      }
      navigate("students");
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  // Yangi o'quvchida ism va dars tanlovi ikkalasi ham to'ldirilgan bo'lishi shart
  const isFormValid = isEdit
    ? Boolean(firstName.trim())
    : Boolean(firstName.trim() && lessonSlots !== null);

  return (
    <div class="student-form-page">
      <h2 class="home-title">
        {isEdit ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
      </h2>

      <form class="form-card" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label">Ism *</label>
          <input
            type="text"
            class="form-input"
            placeholder="Ismni kiriting"
            value={firstName}
            onInput={(e) => setFirstName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div class="form-group">
          <label class="form-label">Familiya</label>
          <input
            type="text"
            class="form-input"
            placeholder="Familiyani kiriting"
            value={lastName}
            onInput={(e) => setLastName(e.target.value)}
          />
        </div>

        <div class="form-group">
          <label class="form-label">Sinf</label>
          <input
            type="text"
            class="form-input"
            placeholder="Masalan: 8 yoki 8-A"
            value={grade}
            onInput={(e) => setGrade(e.target.value)}
          />
        </div>

        <div class="form-group">
          <label class="form-label">Ota-onasi telefon raqami</label>
          <input
            type="tel"
            class="form-input"
            placeholder="Masalan: +998901234567"
            value={parentPhone}
            onInput={(e) => setParentPhone(e.target.value)}
          />
        </div>

        {/* Qaysi darsga uch holatli tanlov: 1-dars | 2-dars | Ikkalasi */}
        <div class="form-group">
          <label class="form-label">Qaysi darsga *</label>
          <div class="slot-selection-chips">
            <button
              type="button"
              class={`slot-select-btn ${lessonSlots === 1 ? "active" : ""}`}
              onClick={() => setLessonSlots(1)}
            >
              1-dars
            </button>
            <button
              type="button"
              class={`slot-select-btn ${lessonSlots === 2 ? "active" : ""}`}
              onClick={() => setLessonSlots(2)}
            >
              2-dars
            </button>
            <button
              type="button"
              class={`slot-select-btn ${lessonSlots === 3 ? "active" : ""}`}
              onClick={() => setLessonSlots(3)}
            >
              Ikkalasi
            </button>
          </div>
        </div>
      </form>

      {/* Saqlash paneli (SaveDock) */}
      <SaveDock
        visible={true}
        disabled={!isFormValid}
        loading={isSubmitting}
        text="Saqlash"
        onSave={handleSubmit}
      />
    </div>
  );
}
