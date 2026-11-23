import { useState, useEffect } from "preact/hooks";
import { fetchPortalStudents } from "./portalApi.js";
import { PortalStudentDetail } from "./PortalStudentDetail.jsx";

const GRADE_CHIPS = ["Barchasi", "7-sinf", "8-sinf", "9-sinf", "10-sinf", "11-sinf"];

export function PortalStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("Barchasi");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    loadStudents();
  }, [search, selectedGrade]);

  const loadStudents = () => {
    setLoading(true);
    const gradeParam = selectedGrade === "Barchasi" ? "" : selectedGrade;
    fetchPortalStudents(search, gradeParam)
      .then((data) => {
        setStudents(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "O'quvchilarni yuklab bo'lmadi");
        setLoading(false);
      });
  };

  return (
    <div>
      {/* Search Input */}
      <div class="portal-search-box">
        <svg class="portal-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          class="portal-search-input"
          placeholder="O'quvchi ismi yoki familiyasi bo'yicha qidirish..."
          value={search}
          onInput={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grade Filter Chips */}
      <div class="portal-chips-row">
        {GRADE_CHIPS.map((g) => (
          <button
            key={g}
            class={`portal-chip ${selectedGrade === g ? "active" : ""}`}
            onClick={() => setSelectedGrade(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {/* List Header */}
      <div class="portal-card-header">
        <h3 class="portal-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E4002B" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          O'quvchilar ro'yxati ({students.length})
        </h3>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#6B7280" }}>
          Yuklanmoqda...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#E4002B" }}>
          {error}
        </div>
      ) : students.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#9CA3AF" }}>
          O'quvchilar topilmadi
        </div>
      ) : (
        <div>
          {students.map((st) => (
            <div
              key={st.id}
              class="portal-list-item"
              onClick={() => setSelectedStudentId(st.id)}
            >
              <div class="portal-item-left">
                <div class={`portal-rank-num ${st.rank && st.rank <= 3 ? "top-rank" : ""}`}>
                  {st.rank ? `#${st.rank}` : "-"}
                </div>
                <div>
                  <div class="portal-item-name">
                    {st.first_name} {st.last_name || ""}
                  </div>
                  <div class="portal-item-sub">
                    {st.grade || "Sinf belgilanmagan"}
                    {st.absences_count > 0 && (
                      <span style={{ color: "#EF4444", marginLeft: "8px" }}>
                        {st.absences_count} ta qoldirgan
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div class="portal-item-right">
                <div class="portal-score-pill">
                  {st.total_score} ball
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
