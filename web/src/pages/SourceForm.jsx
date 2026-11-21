import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { SaveDock } from "../components/SaveDock.jsx";
import { Modal } from "../components/Modal.jsx";

export function SourceForm({ id }) {
  const isEdit = Boolean(id);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    apiRequest(`/api/sources/${id}`)
      .then((data) => {
        if (active && data) {
          setTitle(data.title_uz || data.title || "");
          setText(data.text_uz || data.text || "");
        }
      })
      .catch((err) => {
        showToast(err.message || "Manbani yuklashda xatolik", "error");
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

    const cleanTitle = title.trim();
    const cleanText = text.trim();

    if (!cleanTitle) {
      showToast("Sarlavhani kiriting", "warn");
      return;
    }

    if (!cleanText) {
      showToast("Matn yoki havolani kiriting", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await apiRequest(`/api/sources/${id}`, {
          method: "PUT",
          body: {
            title_uz: cleanTitle,
            title_en: cleanTitle,
            title_ru: cleanTitle,
            text_uz: cleanText,
            text_en: cleanText,
            text_ru: cleanText
          }
        });
        showToast("Manba yangilandi", "success");
      } else {
        await apiRequest("/api/sources", {
          method: "POST",
          body: {
            title: cleanTitle,
            text: cleanText,
            source_lang: "uz"
          }
        });
        showToast("Manba qo'shildi", "success");
      }
      navigate("sources");
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest(`/api/sources/${id}`, {
        method: "DELETE"
      });
      showToast("Manba o'chirildi", "success");
      setDeleteModalOpen(false);
      navigate("sources");
    } catch (err) {
      showToast(err.message || "O'chirishda xatolik", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div class="student-form-page">
      <h2 class="home-title">
        {isEdit ? "Manbani tahrirlash" : "Yangi manba"}
      </h2>

      <form class="form-card" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label">Sarlavha *</label>
          <input
            type="text"
            class="form-input"
            placeholder="Masalan: Darslik havolasi"
            value={title}
            onInput={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div class="form-group">
          <label class="form-label">Matn yoki havola (URL) *</label>
          <textarea
            class="form-input"
            style={{ height: "96px", padding: "10px 12px", resize: "none" }}
            placeholder="Matn yoki URL havolani kiriting"
            value={text}
            onInput={(e) => setText(e.target.value)}
            required
          />
        </div>

        {isEdit && (
          <button
            type="button"
            class="btn-danger-outline"
            onClick={() => setDeleteModalOpen(true)}
          >
            Manbani o'chirish
          </button>
        )}
      </form>

      <SaveDock
        visible={true}
        disabled={!title.trim() || !text.trim()}
        loading={isSubmitting}
        text="Saqlash"
        onSave={handleSubmit}
      />

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Manbani o'chirish"
      >
        <div style={{ padding: "8px 0 16px", color: "var(--text)", fontSize: "14px" }}>
          Ushbu manba butunlay o'chiriladi. Ishonchingiz komilmi?
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            class="filter-chip"
            onClick={() => setDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            class="btn-action-fine"
            style={{ height: "36px", padding: "0 16px" }}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
