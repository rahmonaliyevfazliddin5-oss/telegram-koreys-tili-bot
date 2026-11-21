import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { formatName, formatMoney } from "../lib/format.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { Avatar } from "../components/Avatar.jsx";
import { Sheet } from "../components/Sheet.jsx";
import { Modal } from "../components/Modal.jsx";

export function StudentProfile({ id }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Jarima sheet holati
  const [fineSheetOpen, setFineSheetOpen] = useState(false);
  const [fineAmount, setFineAmount] = useState("10000");
  const [isFineSubmitting, setIsFineSubmitting] = useState(false);

  // Qarzni yopish (to'lov) sheet holati
  const [collectSheetOpen, setCollectSheetOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [isCollectSubmitting, setIsCollectSubmitting] = useState(false);

  // Kaskadli o'chirish modal holati
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProfile = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await apiRequest(`/api/students/${id}/profile`);
      setProfile(data);
    } catch (err) {
      showToast(err.message || "Profilni yuklashda xatolik", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
        Profil yuklanmoqda...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
        O'quvchi topilmadi
      </div>
    );
  }

  const { student, stats, history, attendance_history } = profile;
  const totalDebt = stats?.total_debt || 0;

  // Jarima saqlash
  const handleFineSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseInt(fineAmount, 10);
    if (!amountNum || amountNum <= 0) {
      showToast("Jarima summasini to'g'ri kiriting", "warn");
      return;
    }

    setIsFineSubmitting(true);
    try {
      await apiRequest(`/api/students/${id}/fine`, {
        method: "POST",
        body: { amount: amountNum }
      });
      showToast("Jarima belgilandi", "success");
      setFineSheetOpen(false);
      await loadProfile();
    } catch (err) {
      showToast(err.message || "Jarima kiritishda xatolik", "error");
    } finally {
      setIsFineSubmitting(false);
    }
  };

  // Qarzni yopish (to'lov) saqlash
  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseInt(collectAmount, 10);
    if (!amountNum || amountNum <= 0) {
      showToast("To'lov summasini to'g'ri kiriting", "warn");
      return;
    }

    if (amountNum > totalDebt) {
      showToast(`To'lov jami qarzdan (${formatMoney(totalDebt)}) oshib ketmasligi kerak`, "warn");
      return;
    }

    setIsCollectSubmitting(true);
    try {
      await apiRequest(`/api/students/${id}/collect`, {
        method: "POST",
        body: { amount: amountNum }
      });
      showToast("To'lov qabul qilindi", "success");
      setCollectSheetOpen(false);
      await loadProfile();
    } catch (err) {
      showToast(err.message || "To'lov kiritishda xatolik", "error");
    } finally {
      setIsCollectSubmitting(false);
    }
  };

  // O'quvchini kaskadli o'chirish
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await apiRequest(`/api/students/${id}`, {
        method: "DELETE"
      });
      showToast("O'quvchi o'chirildi", "success");
      setDeleteModalOpen(false);
      navigate("students");
    } catch (err) {
      showToast(err.message || "O'chirishda xatolik", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div class="profile-page">
      {/* 1. O'quvchi asosiy kartasi */}
      <div class="profile-top-card">
        <div class="profile-top-left">
          <Avatar
            lastName={student.last_name}
            firstName={student.first_name}
            size={52}
          />
          <div class="profile-top-info">
            <span class="profile-top-name">
              {formatName(student.last_name, student.first_name)}
            </span>
            {student.grade && student.grade.trim() ? (
              <span class="student-grade-chip">
                {student.grade.trim()}-sinf
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          class="btn-icon-action"
          onClick={() => navigate(`student-form/${id}`)}
          title="Tahrirlash"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>

      {/* 2. 6 ta asosiy ko'rsatkich (B17: 2 ustunli 3 qator ixcham grid) */}
      <div class="profile-stats-grid">
        <div class="stat-grid-box">
          <span class="stat-grid-label">Jami dars qoldirgan</span>
          <span class="stat-grid-val">{stats.total_absences}</span>
        </div>

        <div class="stat-grid-box">
          <span class="stat-grid-label">Jami kech qolgan</span>
          <span class="stat-grid-val">{stats.total_lates}</span>
        </div>

        <div class="stat-grid-box">
          <span class="stat-grid-label">Jami ball</span>
          <span class="stat-grid-val">{stats.total_score}</span>
        </div>

        <div class="stat-grid-box">
          <span class="stat-grid-label">Dars bali</span>
          <span class="stat-grid-val">{stats.daily_score}</span>
        </div>

        <div class="stat-grid-box">
          <span class="stat-grid-label">Imtihon bali</span>
          <span class="stat-grid-val">{stats.exam_score}</span>
        </div>

        <div class="stat-grid-box">
          <span class="stat-grid-label">Jami qarz</span>
          <span class={`stat-grid-val ${totalDebt > 0 ? "val-debt-bad" : "val-debt-ok"}`}>
            {formatMoney(totalDebt)}
          </span>
        </div>
      </div>

      {/* 3. Amallar (Jarima va Qarzni yopish) */}
      <div class="profile-actions-grid">
        <button
          type="button"
          class="btn-action-fine"
          onClick={() => {
            setFineAmount("10000");
            setFineSheetOpen(true);
          }}
        >
          Jarima qo'shish
        </button>

        <button
          type="button"
          class="btn-action-collect"
          onClick={() => {
            if (totalDebt <= 0) {
              showToast("O'quvchining qarzi mavjud emas", "info");
              return;
            }
            setCollectAmount(String(totalDebt));
            setCollectSheetOpen(true);
          }}
        >
          Qarzni yopish
        </button>
      </div>

      {/* 4. Amallar tarixi (Jarimalar va to'lovlar) */}
      {history && history.length > 0 && (
        <div class="profile-history-card">
          <span class="profile-history-header">To'lovlar va jarimalar tarixi</span>
          {history.slice(0, 10).map((item) => (
            <div key={item.id} class="history-item-row">
              <span class={`history-item-type ${item.type === "fine" ? "history-type-fine" : "history-type-payment"}`}>
                {item.type === "fine" ? "Jarima" : "To'lov"}: {formatMoney(item.amount)}
              </span>
              <span class="history-item-date">
                {item.created_at ? item.created_at.slice(0, 10) : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Oxirgi davomat belgilari */}
      {attendance_history && attendance_history.length > 0 && (
        <div class="profile-history-card">
          <span class="profile-history-header">Oxirgi davomat belgilari</span>
          {attendance_history.slice(0, 10).map((record) => (
            <div key={record.id} class="history-item-row">
              <span>{record.date} ({record.lesson}-dars): {record.status_text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 6. O'quvchini o'chirish tugmasi */}
      <button
        type="button"
        class="btn-danger-outline"
        onClick={() => setDeleteModalOpen(true)}
      >
        O'quvchini o'chirish
      </button>

      {/* Jarima qo'shish Sheet */}
      <Sheet
        isOpen={fineSheetOpen}
        onClose={() => setFineSheetOpen(false)}
        title="Jarima belgilash"
      >
        <form class="start-lesson-form" onSubmit={handleFineSubmit}>
          <div class="form-group">
            <label class="form-label">Summa (so'm)</label>
            <input
              type="number"
              class="form-input"
              value={fineAmount}
              onInput={(e) => setFineAmount(e.target.value)}
              min="1000"
              step="1000"
              required
            />
          </div>

          <div class="quick-amount-chips">
            <button
              type="button"
              class="quick-chip"
              onClick={() => setFineAmount("10000")}
            >
              +10 000
            </button>
            <button
              type="button"
              class="quick-chip"
              onClick={() => setFineAmount("20000")}
            >
              +20 000
            </button>
            <button
              type="button"
              class="quick-chip"
              onClick={() => setFineAmount("50000")}
            >
              +50 000
            </button>
          </div>

          <button
            type="submit"
            class="start-lesson-btn"
            disabled={isFineSubmitting || !fineAmount}
          >
            {isFineSubmitting ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </Sheet>

      {/* Qarzni yopish Sheet */}
      <Sheet
        isOpen={collectSheetOpen}
        onClose={() => setCollectSheetOpen(false)}
        title="Qarzni yopish (to'lov)"
      >
        <form class="start-lesson-form" onSubmit={handleCollectSubmit}>
          <div class="form-group">
            <label class="form-label">To'lov summasi (so'm)</label>
            <input
              type="number"
              class="form-input"
              value={collectAmount}
              onInput={(e) => setCollectAmount(e.target.value)}
              min="1000"
              max={totalDebt}
              step="1000"
              required
            />
          </div>

          <div class="quick-amount-chips">
            <button
              type="button"
              class="quick-chip"
              onClick={() => setCollectAmount(String(totalDebt))}
            >
              To'liq yopish ({formatMoney(totalDebt)})
            </button>
          </div>

          <button
            type="submit"
            class="start-lesson-btn"
            disabled={isCollectSubmitting || !collectAmount}
          >
            {isCollectSubmitting ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </Sheet>

      {/* Kaskadli o'chirish Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="O'quvchini o'chirish"
      >
        <div style={{ padding: "8px 0 16px", color: "var(--text)", fontSize: "14px", lineHeight: "1.5" }}>
          O'quvchi va uning barcha baholari, davomati va to'lovlari o'chiriladi. Ishonchingiz komilmi?
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
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
