import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { formatName, matchStudentSearch } from "../lib/format.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";
import { Avatar } from "../components/Avatar.jsx";

export function Students() {
  const [students, setStudents] = useState([]);
  const [scoresMap, setScoresMap] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null); // string | "unset_slot" | null
  const [isLoading, setIsLoading] = useState(true);

  // Ommaviy tanlash rejimi (Bulk selection)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Long press timer ref
  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

  // 250ms debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Ma'lumotlarni yuklash
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

  // Mavjud sinflar
  const uniqueGrades = useMemo(() => {
    const gradesSet = new Set();
    for (const s of students) {
      if (s.grade && s.grade.trim()) {
        gradesSet.add(s.grade.trim());
      }
    }
    return Array.from(gradesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // Filtrlash
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // 1. Sinf yoki Belgilanmagan filtri
        if (selectedGrade === "unset_slot") {
          if (s.lesson_slots !== null && s.lesson_slots !== undefined) return false;
        } else if (selectedGrade !== null) {
          if (s.grade !== selectedGrade) return false;
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

  // Long press orqali tanlash rejimini yoqish
  const handleTouchStart = (studentId) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsSelectMode(true);
      setSelectedIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Qator bosilganda
  const handleRowClick = (studentId) => {
    if (isLongPressTriggeredRef.current) return;

    if (isSelectMode) {
      setSelectedIds((prev) =>
        prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
      );
    } else {
      navigate(`student-profile/${studentId}`);
    }
  };

  // Hammasini tanlash (filtrlanganlar)
  const handleSelectAll = () => {
    const allFilteredIds = filteredStudents.map((s) => s.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Ommaviy darsga biriktirish
  const handleBulkAssignSlots = async (slotVal) => {
    if (selectedIds.length === 0 || isBulkSubmitting) return;

    setIsBulkSubmitting(true);
    try {
      await apiRequest("/api/students/bulk-slots", {
        method: "POST",
        body: {
          student_ids: selectedIds,
          lesson_slots: slotVal
        }
      });
      showToast("Darsga biriktirildi", "success");
      setIsSelectMode(false);
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Slot badge chiqarish
  const renderSlotBadge = (slots) => {
    if (slots === 1) {
      return <span class="slot-badge-chip slot-badge-1" title="Faqat 1-dars">1</span>;
    } else if (slots === 2) {
      return <span class="slot-badge-chip slot-badge-2" title="Faqat 2-dars">2</span>;
    } else if (slots === 3) {
      return <span class="slot-badge-chip slot-badge-both" title="1 va 2-dars">1+2</span>;
    }
    return <span class="slot-badge-chip slot-badge-unset" title="Belgilanmagan">?</span>;
  };

  return (
    <div class="students-page" style={{ paddingBottom: isSelectMode ? "140px" : "60px" }}>
      {/* Sarlavha qatori */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 class="home-title" style={{ margin: 0 }}>O'quvchilar</h2>
        {!isSelectMode ? (
          <button
            type="button"
            class="btn-link"
            onClick={() => setIsSelectMode(true)}
          >
            Tanlash
          </button>
        ) : (
          <button
            type="button"
            class="btn-link"
            onClick={() => {
              setIsSelectMode(false);
              setSelectedIds([]);
            }}
          >
            Bekor qilish
          </button>
        )}
      </div>

      {/* Tanlash rejimi sarlavha paneli */}
      {isSelectMode && (
        <div class="bulk-select-header">
          <span>Tanlandi: {selectedIds.length}</span>
          <button
            type="button"
            class="btn-link"
            style={{ color: "var(--brand)" }}
            onClick={handleSelectAll}
          >
            {filteredStudents.length > 0 &&
            filteredStudents.every((s) => selectedIds.includes(s.id))
              ? "Tanlovni bekor qilish"
              : "Hammasini tanlash"}
          </button>
        </div>
      )}

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

      {/* Filtr chiplari (Sinf va Belgilanmagan) */}
      <div class="filter-chips-row">
        <button
          type="button"
          class={`filter-chip ${selectedGrade === null ? "active" : ""}`}
          onClick={() => setSelectedGrade(null)}
        >
          Hammasi
        </button>

        {uniqueGrades.length >= 2 &&
          uniqueGrades.map((grade) => (
            <button
              key={grade}
              type="button"
              class={`filter-chip ${selectedGrade === grade ? "active" : ""}`}
              onClick={() => setSelectedGrade(grade)}
            >
              {grade}-sinf
            </button>
          ))}

        {/* Belgilanmagan (NULL) o'quvchilar filtri */}
        <button
          type="button"
          class={`filter-chip ${selectedGrade === "unset_slot" ? "active" : ""}`}
          onClick={() => setSelectedGrade("unset_slot")}
        >
          Belgilanmagan
        </button>
      </div>

      {/* Alohida satrda Jami soni */}
      <div class="students-count-row">
        Jami: {filteredStudents.length}
      </div>

      {/* O'quvchilar ro'yxati */}
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
            const isSelected = selectedIds.includes(student.id);

            return (
              <div
                key={student.id}
                class="student-row-item"
                onClick={() => handleRowClick(student.id)}
                onTouchStart={() => handleTouchStart(student.id)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(student.id)}
                onMouseUp={handleTouchEnd}
              >
                <div class="student-row-left">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      class="student-checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                    />
                  )}

                  <Avatar
                    lastName={student.last_name}
                    firstName={student.first_name}
                    size={36}
                  />

                  <div class="student-row-info">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span class="student-row-name">
                        {formatName(student.last_name, student.first_name)}
                      </span>
                      {renderSlotBadge(student.lesson_slots)}
                    </div>

                    {student.grade && student.grade.trim() ? (
                      <span class="student-grade-chip">
                        {student.grade.trim()}-sinf
                      </span>
                    ) : null}
                  </div>
                </div>

                {score !== undefined && !isSelectMode && (
                  <span class="student-score-badge">
                    {score} ball
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Yangi o'quvchi qo'shish FAB (tanlash rejimida yashiriladi) */}
      {!isSelectMode && (
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
      )}

      {/* Tanlash rejimida Darsga biriktirish pastki dock paneli */}
      {isSelectMode && selectedIds.length > 0 && (
        <div class="bulk-action-dock">
          <div class="bulk-dock-card">
            <span class="bulk-dock-title">
              Darsga biriktirish ({selectedIds.length} ta o'quvchi)
            </span>
            <div class="bulk-dock-buttons">
              <button
                type="button"
                class="bulk-slot-btn"
                onClick={() => handleBulkAssignSlots(1)}
                disabled={isBulkSubmitting}
              >
                1-dars
              </button>
              <button
                type="button"
                class="bulk-slot-btn"
                onClick={() => handleBulkAssignSlots(2)}
                disabled={isBulkSubmitting}
              >
                2-dars
              </button>
              <button
                type="button"
                class="bulk-slot-btn"
                onClick={() => handleBulkAssignSlots(3)}
                disabled={isBulkSubmitting}
              >
                Ikkalasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
