import { useState, useEffect } from "preact/hooks";
import { fetchPortalAttendance } from "./portalApi.js";
import { PortalStudentDetail } from "./PortalStudentDetail.jsx";

export function PortalAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLesson, setActiveLesson] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = () => {
    setLoading(true);
    fetchPortalAttendance()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Davomatni yuklab bo'lmadi");
        setLoading(false);
      });
  };

  const currentLessonData = data ? (activeLesson === 1 ? data.lesson_1 : data.lesson_2) : null;

  return (
    <div>
      {/* Date Header */}
      {data && (
        <div class="portal-card" style={{ padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Davomat sanasi
              </span>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#1F1F2E", marginTop: "2px" }}>
                {data.date}
              </div>
            </div>
            {data.is_weekend && (
              <span style={{
                fontSize: "11px",
                fontWeight: "600",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "#FEE2E2",
                color: "#DC2626"
              }}>
                Dam olish kuni
              </span>
            )}
          </div>
        </div>
      )}

      {/* Lesson Selector Chips */}
      <div class="portal-chips-row">
        <button
          class={`portal-chip ${activeLesson === 1 ? "active" : ""}`}
          onClick={() => setActiveLesson(1)}
        >
          1-dars (07:00)
        </button>
        <button
          class={`portal-chip ${activeLesson === 2 ? "active" : ""}`}
          onClick={() => setActiveLesson(2)}
        >
          2-dars (15:45)
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#6B7280" }}>
          Davomat yuklanmoqda...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#E4002B" }}>
          {error}
        </div>
      ) : currentLessonData ? (
        <div>
          {/* Lesson Status Card */}
          <div class="portal-card">
            <div class="portal-card-header">
              <h4 class="portal-card-title">
                {activeLesson}-dars holati
              </h4>
              <span style={{
                fontSize: "11px",
                fontWeight: "700",
                color: currentLessonData.is_started ? "#16A34A" : "#6B7280"
              }}>
                {currentLessonData.is_started ? "Dars boshlangan" : "Dars boshlanmagan"}
              </span>
            </div>

            {currentLessonData.topic && (
              <div style={{
                fontSize: "13px",
                color: "#1F1F2E",
                marginBottom: "12px",
                background: "#FFF7F8",
                border: "1px solid #F3E8E9",
                padding: "8px 12px",
                borderRadius: "8px"
              }}>
                <span style={{ color: "#6B7280", fontSize: "11px", display: "block" }}>Dars mavzusi:</span>
                {currentLessonData.topic}
              </div>
            )}

            {/* Stat Counters Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              marginTop: "10px"
            }}>
              <div style={{
                background: "#F0FDF4",
                border: "1px solid #DCFCE7",
                borderRadius: "10px",
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#16A34A" }}>
                  {currentLessonData.attended_count}
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>Qatnashdi</div>
              </div>
              <div style={{
                background: "#FFFBEB",
                border: "1px solid #FEF3C7",
                borderRadius: "10px",
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#D97706" }}>
                  {currentLessonData.late_count}
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>Kech qoldi</div>
              </div>
              <div style={{
                background: currentLessonData.absent_count > 0 ? "#FEF2F2" : "#F9FAFB",
                border: `1px solid ${currentLessonData.absent_count > 0 ? "#FEE2E2" : "#F3F4F6"}`,
                borderRadius: "10px",
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "16px",
                  fontWeight: "800",
                  color: currentLessonData.absent_count > 0 ? "#DC2626" : "#6B7280"
                }}>
                  {currentLessonData.absent_count}
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>Qoldirdi</div>
              </div>
            </div>
          </div>

          {/* Attendance List Header */}
          <div class="portal-card-header">
            <h4 class="portal-card-title">
              O'quvchilar ({currentLessonData.students?.length || 0})
            </h4>
          </div>

          {(!currentLessonData.students || currentLessonData.students.length === 0) ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#9CA3AF" }}>
              Davomat qaydlari topilmadi
            </div>
          ) : (
            <div>
              {currentLessonData.students.map((st) => (
                <div
                  key={st.id}
                  class="portal-list-item"
                  onClick={() => setSelectedStudentId(st.id)}
                >
                  <div class="portal-item-left">
                    <div>
                      <div class="portal-item-name">{st.name}</div>
                      <div class="portal-item-sub">{st.grade || "Sinf belgilanmagan"}</div>
                    </div>
                  </div>
                  <div class="portal-item-right">
                    {st.status === "present" && (
                      <span class="portal-badge-present">Keldi</span>
                    )}
                    {st.status === "late" && (
                      <span class="portal-badge-late">
                        Kech (+{st.late_minutes || 0}m)
                      </span>
                    )}
                    {st.status === "absent" && (
                      <span class="portal-badge-absent">Kelmadi</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Selected Student Detail Modal */}
      {selectedStudentId && (
        <PortalStudentDetail
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}
