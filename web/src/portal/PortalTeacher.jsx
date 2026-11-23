import { useState, useEffect } from "preact/hooks";
import { fetchPortalTeacher } from "./portalApi.js";

export function PortalTeacher() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortalTeacher()
      .then((data) => {
        setTeacher(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Ma'lumotlarni yuklab bo'lmadi");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#94A3B8" }}>
          O'qituvchi ma'lumotlari yuklanmoqda...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#EF4444" }}>
          {error}
        </div>
      ) : teacher ? (
        <div>
          {/* Main Profile Card */}
          <div class="portal-card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #1E293B, #0F172A)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 8px 24px rgba(245, 158, 11, 0.2)"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "800", color: "#FFFFFF" }}>
              {teacher.name}
            </h2>
            <div style={{ fontSize: "12px", color: "#F59E0B", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Professional Koreys Tili Kurslari
            </div>

            {/* Stats */}
            <div class="portal-stat-grid" style={{ marginTop: "20px", marginBottom: 0 }}>
              <div class="portal-stat-box">
                <div class="portal-stat-num" style={{ color: "#3B82F6" }}>
                  {teacher.total_lessons}
                </div>
                <div class="portal-stat-label">O'tilgan darslar</div>
              </div>
              <div class="portal-stat-box">
                <div class="portal-stat-num" style={{ color: "#10B981" }}>
                  {teacher.total_exams}
                </div>
                <div class="portal-stat-label">Imtihonlar</div>
              </div>
              <div class="portal-stat-box">
                <div class="portal-stat-num" style={{ color: "#F59E0B" }}>
                  TOPIK 1-6
                </div>
                <div class="portal-stat-label">Daraja</div>
              </div>
            </div>
          </div>

          {/* Dars yo'nalishlari */}
          <div class="portal-card">
            <h3 class="portal-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              Dars yo'nalishlari
            </h3>
            <div style={{ fontSize: "13px", color: "#E2E8F0", lineHeight: "1.6", marginTop: "10px" }}>
              {teacher.directions}
            </div>
            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <span class="portal-chip active" style={{ cursor: "default" }}>Tinglash (Titki)</span>
              <span class="portal-chip active" style={{ cursor: "default" }}>O'qish (Ilki)</span>
              <span class="portal-chip active" style={{ cursor: "default" }}>Yozish (Sigi)</span>
              <span class="portal-chip active" style={{ cursor: "default" }}>Gapirish (Maragi)</span>
              <span class="portal-chip active" style={{ cursor: "default" }}>TOPIK Tayyorlov</span>
            </div>
          </div>

          {/* Joylashuv va Manzil */}
          <div class="portal-card">
            <h3 class="portal-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              O'quv markazi manzili
            </h3>
            <div style={{ fontSize: "14px", color: "#FFFFFF", fontWeight: "600", marginTop: "8px" }}>
              {teacher.location}
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
              Mo'ljal: Farg'ona shahri markazi
            </div>
          </div>

          {/* Aloqa */}
          <div class="portal-card">
            <h3 class="portal-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Bog'lanish
            </h3>
            <div style={{ marginTop: "10px" }}>
              <a
                href={`tel:${teacher.phone}`}
                style={{
                  display: "inline-block",
                  padding: "10px 18px",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60A5FA",
                  borderRadius: "10px",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "14px",
                  fontWeight: "700",
                  textDecoration: "none"
                }}
              >
                {teacher.phone}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
