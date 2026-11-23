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
        <div class="portal-card" style={{ padding: "12px 16px", marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Davomat sanasi
              </span>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#FFFFFF", marginTop: "2px" }}>
                {data.date}
              </div>
            </div>
            {data.is_weekend && (
              <span class="portal-mode-pill" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#F87171", borderColor: "rgba(239, 68, 68, 0.3)" }}>
                Dam olish kuni
              </span>
            )}
          </div>
        </div>
      )}

      {/* Lesson Selector Tabs */}
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
        <div style={{ textAlign: "center", padding: "50px 0", color: "#94A3B8" }}>
          Davomat ma'lumotlari yuklanmoqda...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#EF4444" }}>
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
                fontWeight: "600",
                color: currentLessonData.is_started ? "#10B981" : "#94A3B8"
              }}>
                {currentLessonData.is_started ? "Dars boshlangan" : "Dars boshlanmagan"}
              </span>
            </div>

            {currentLessonData.topic && (
              <div style={{ fontSize: "13px", color: "#E2E8F0", marginBottom: "12px", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: "8px" }}>
                <span style={{ color: "#94A3B8", fontSize: "11px", display: "block" }}>Dars mavzusi:</span>
                {currentLessonData.topic}
              </div>
            )}

            {/* Stat Counters */}
            <div class="portal-stat-grid" style={{ marginBottom: 0 }}>
              <div class="portal-stat-box">
                <div class="portal-stat-num" style={{ color: "#10B981" }}>
                  {currentLessonData.attended_count}
                </div>
                <div class="portal-stat-label">Qatnashdi</div>
              </div>
              <div class="portal-stat-box">
                <div class="portal-stat-num" style={{ color: "#F59E0B" }}>
                  {currentLessonData.late_count}
                </div>
                <div class="portal-stat-label">Kech qoldi</div>
              </div>
              <div class="portal-stat-box">
                <div class="portal-stat-num" style={{ color: currentLessonData.absent_count > 0 ? "#EF4444" : "#94A3B8" }}>
                  {currentLessonData.absent_count}
                </div>
                <div class="portal-stat-label">Dars qoldirdi</div>
              </div>
            </div>
          </div>

          {/* Attendance List */}
          <div class="portal-card-header">
            <h4 class="portal-card-title">
              O'quvchilar davomati ({currentLessonData.students?.length || 0})
            </h4>
          </div>

          {(!currentLessonData.students || currentLessonData.students.length === 0) ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#64748B" }}>
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
