import { useState, useEffect, useMemo } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { formatName, matchStudentSearch } from "../lib/format.js";
import { navigate } from "../router.js";
import { Avatar } from "../components/Avatar.jsx";

export function Students() {
  const [students, setStudents] = useState([]);
  const [scoresMap, setScoresMap] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 250ms debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Ma'lumotlarni yuklash (O'quvchilar va reyting ballari)
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, ratingData] = await Promise.all([
        apiRequest("/api/students"),
        apiRequest("/api/rating?limit=100").catch(() => [])
      ]);

      if (Array.isArray(studentsData)) {
        setStudents(studentsData);
      }

      if (Array.isArray(ratingData)) {
        const smap = {};
        for (const item of ratingData) {
          smap[item.id] = item.total_score;
        }
        setScoresMap(smap);
      }
    } catch (err) {
      console.error("Students load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mavjud sinflarni aniqlash
  const uniqueGrades = useMemo(() => {
    const gradesSet = new Set();
    for (const s of students) {
      if (s.grade && s.grade.trim()) {
        gradesSet.add(s.grade.trim());
      }
    }
    return Array.from(gradesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // O'quvchilarni saralash va filtrlash
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // 1. Sinf filtri
        if (selectedGrade !== null && s.grade !== selectedGrade) {
          return false;
        }
        // 2. Qidiruv filtri
        if (debouncedSearch && !matchStudentSearch(s, debouncedSearch)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const nameA = formatName(a.last_name, a.first_name).toLowerCase();
        const nameB = formatName(b.last_name, b.first_name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [students, selectedGrade, debouncedSearch]);

  return (
    <div class="students-page">
      {/* Sarlavha */}
      <h2 class="home-title">O'quvchilar</h2>

      {/* Qidiruv paneli */}
      <div class="search-bar-wrap">
        <svg
          class="search-icon-svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <input
          type="text"
          class="search-input"
          placeholder="Ism, familiya yoki sinf bo'yicha qidiruv..."
          value={search}
          onInput={(e) => setSearch(e.target.value)}
        />

        {search && (
          <button
            type="button"
            class="search-clear-btn"
            onClick={() => setSearch("")}
            title="Tozalash"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Sinf filtri chiplari (B8: Faqat kamida 2 xil sinf bazada bo'lsa ko'rsatiladi) */}
      {uniqueGrades.length >= 2 && (
        <div class="filter-chips-row">
          <button
            type="button"
            class={`filter-chip ${selectedGrade === null ? "active" : ""}`}
            onClick={() => setSelectedGrade(null)}
          >
            Hammasi
          </button>
          {uniqueGrades.map((grade) => (
            <button
              key={grade}
              type="button"
              class={`filter-chip ${selectedGrade === grade ? "active" : ""}`}
              onClick={() => setSelectedGrade(grade)}
            >
              {grade}-sinf
            </button>
          ))}
        </div>
      )}

      {/* Alohida satrda Jami o'quvchilar soni (B8) */}
      <div class="students-count-row">
        Jami: {filteredStudents.length}
      </div>

      {/* O'quvchilar ro'yxati (B9: chevronlar olib tashlangan, B10: faqat kiritilgan sinf) */}
      <div class="students-card-list">
        {isLoading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
            Yuklanmoqda...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
            O'quvchilar topilmadi
          </div>
        ) : (
          filteredStudents.map((student) => {
            const score = scoresMap[student.id];
            return (
              <div
                key={student.id}
                class="student-row-item"
                onClick={() => navigate(`student-profile/${student.id}`)}
              >
                <div class="student-row-left">
                  <Avatar
                    lastName={student.last_name}
                    firstName={student.first_name}
                    size={36}
                  />
                  <div class="student-row-info">
                    <span class="student-row-name">
                      {formatName(student.last_name, student.first_name)}
                    </span>
                    {student.grade && student.grade.trim() ? (
                      <span class="student-grade-chip">
                        {student.grade.trim()}-sinf
                      </span>
                    ) : null}
                  </div>
                </div>

                {score !== undefined && (
                  <span class="student-score-badge">
                    {score} ball
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Yangi o'quvchi qo'shish FAB tugmasi (B9: 52px, pastki tab ustidan 16px) */}
      <button
        type="button"
        class="fab"
        onClick={() => navigate("student-form")}
        title="O'quvchi qo'shish"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
}
