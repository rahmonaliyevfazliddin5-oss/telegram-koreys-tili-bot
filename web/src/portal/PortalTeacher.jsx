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
        <div style={{ textAlign: "center", padding: "50px 0", color: "#6B7280" }}>
          O'qituvchi ma'lumotlari yuklanmoqda...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#E4002B" }}>
          {error}
        </div>
      ) : teacher ? (
        <div>
          {/* Main Profile Card */}
          <div class="portal-card" style={{ textAlign: "center", padding: "20px 16px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#FFF7F8",
              border: "1px solid #F3E8E9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E4002B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: "800", color: "#1F1F2E" }}>
              {teacher.name}
            </h2>
            <div style={{ fontSize: "12px", color: "#E4002B", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Professional Koreys Tili Kurslari
            </div>

            {/* Stats Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              marginTop: "16px"
            }}>
              <div style={{
                background: "#F9FAFB",
                border: "1px solid #F3F4F6",
                borderRadius: "10px",
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#1F1F2E" }}>
                  {teacher.total_lessons}
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>O'tilgan darslar</div>
              </div>
              <div style={{
                background: "#F9FAFB",
                border: "1px solid #F3F4F6",
                borderRadius: "10px",
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#16A34A" }}>
                  {teacher.total_exams}
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>Imtihonlar</div>
              </div>
              <div style={{
                background: "#FFF7F8",
                border: "1px solid #F3E8E9",
                borderRadius: "10px",
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#E4002B" }}>
                  1 - 6
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>TOPIK daraja</div>
              </div>
            </div>
          </div>

          {/* Dars yo'nalishlari */}
          <div class="portal-card">
            <h3 class="portal-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E4002B" stroke-width="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              Dars yo'nalishlari
            </h3>
            <div style={{ fontSize: "13px", color: "#1F1F2E", lineHeight: "1.6", marginTop: "8px" }}>
              {teacher.directions}
            </div>
            <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              O'quv markazi manzili
            </h3>
            <div style={{ fontSize: "14px", color: "#1F1F2E", fontWeight: "700", marginTop: "6px" }}>
              {teacher.location}
            </div>
            <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
              Mo'ljal: Farg'ona shahri markazi
            </div>
          </div>

          {/* Aloqa */}
          <div class="portal-card">
            <h3 class="portal-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2">
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
                  background: "#EFF6FF",
                  color: "#2563EB",
                  borderRadius: "10px",
                  border: "1px solid #BFDBFE",
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
