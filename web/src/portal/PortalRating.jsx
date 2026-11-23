import { useState, useEffect } from "preact/hooks";
import { fetchPortalLeaderboard } from "./portalApi.js";
import { PortalPodium } from "./PortalPodium.jsx";
import { PortalStudentDetail } from "./PortalStudentDetail.jsx";

export function PortalRating() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = () => {
    setLoading(true);
    fetchPortalLeaderboard()
      .then((data) => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Reytingni yuklab bo'lmadi");
        setLoading(false);
      });
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${s.first_name} ${s.last_name || ""} ${s.grade || ""}`.toLowerCase();
    return fullName.includes(q);
  });

  const topThree = students.slice(0, 3);

  return (
    <div>
      {/* Search Bar */}
      <div class="portal-search-box">
        <svg class="portal-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          class="portal-search-input"
          placeholder="O'quvchi ismi yoki familiyasi..."
          value={search}
          onInput={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#94A3B8" }}>
          Reyting yuklanmoqda...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#EF4444" }}>
          {error}
        </div>
      ) : (
        <div>
          {/* Top 3 Podium (agar qidiruv bo'sh bo'lsa) */}
          {!search.trim() && topThree.length > 0 && (
            <PortalPodium
              topStudents={topThree}
              onSelectStudent={(s) => setSelectedStudentId(s.id)}
            />
          )}

          {/* Leaderboard List Header */}
          <div class="portal-card-header" style={{ marginTop: "12px" }}>
            <h3 class="portal-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Umumiy reyting ({filteredStudents.length})
            </h3>
          </div>

          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#64748B" }}>
              O'quvchi topilmadi
            </div>
          ) : (
            <div>
              {filteredStudents.map((st) => (
                <div
                  key={st.id}
                  class="portal-list-item"
                  onClick={() => setSelectedStudentId(st.id)}
                >
                  <div class="portal-item-left">
                    <div class={`portal-rank-num ${st.rank <= 3 ? "top-rank" : ""}`}>
                      {st.rank}
                    </div>
                    <div>
                      <div class="portal-item-name">
                        {st.first_name} {st.last_name || ""}
                      </div>
                      <div class="portal-item-sub">
                        {st.grade || "Sinf belgilanmagan"}
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
