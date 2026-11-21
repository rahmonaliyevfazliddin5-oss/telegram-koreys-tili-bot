import { useState, useEffect, useMemo } from "preact/hooks";
import { subscribeStatus, getStatus, fetchStatus } from "../store/status.js";
import { apiRequest } from "../lib/api.js";
import { formatName, matchStudentSearch, MONTH_NAMES_UZ } from "../lib/format.js";
import { showToast } from "../components/Toast.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { WeekStrip } from "../components/WeekStrip.jsx";
import { MonthSheet } from "../components/MonthSheet.jsx";
import { Sheet } from "../components/Sheet.jsx";
import { SaveDock } from "../components/SaveDock.jsx";

export function Grading({ lesson: initialLesson = 1 }) {
  const [status, setStatus] = useState(getStatus());
  const todayDate = status?.date || new Date().toISOString().slice(0, 10);

  // Standart tanlangan sana:
  // B7: Agar bugun shanba yoki yakshanba bo'lsa, standart tanlov = joriy haftaning JUMA kuni.
  const getDefaultDate = (todayStr, isWeekendDay) => {
    if (!isWeekendDay) return todayStr;
    const d = new Date(todayStr);
    const day = d.getDay(); // 0 is Sun, 6 is Sat
    const diffToFriday = day === 6 ? -1 : -2;
    d.setDate(d.getDate() + diffToFriday);
    return d.toISOString().slice(0, 10);
  };

  const isWeekendDay = Boolean(status?.is_weekend || status?.is_rest_day);
  const [selectedDate, setSelectedDate] = useState(() => getDefaultDate(todayDate, isWeekendDay));
  const [activeLesson, setActiveLesson] = useState(Number(initialLesson) || 1);

  // O'quvchilar va baholar
  const [gradesList, setGradesList] = useState([]);
  const [draftMap, setDraftMap] = useState({}); // { [student_id]: { value: number|null, status: string, late_minutes: number|null } }
  const [initialMap, setInitialMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // UI holatlari
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);

  // Dars boshlash Sheet
  const [startLessonSheetOpen, setStartLessonSheetOpen] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [isStartingLesson, setIsStartingLesson] = useState(false);

  // Kech qolish modal/sheet
  const [lateSheetStudent, setLateSheetStudent] = useState(null);
  const [lateMinutesInput, setLateMinutesInput] = useState("15");

  // Status obunasi
  useEffect(() => {
    return subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  // Ma'lumotlarni yuklash
  const loadGrades = async () => {
    if (!selectedDate) return;
    try {
      setIsLoading(true);
      const data = await apiRequest(`/api/grades?date=${selectedDate}&lesson=${activeLesson}`);
      if (Array.isArray(data)) {
        setGradesList(data);
        const initM = {};
        for (const item of data) {
          initM[item.student_id] = {
            value: item.value,
            status: item.status,
            late_minutes: item.late_minutes
          };
        }
        setInitialMap(initM);
        setDraftMap(initM);
      }
    } catch (err) {
      showToast(err.message || "Baholarni yuklashda xatolik", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, [selectedDate, activeLesson]);

  // Holat mashinasi (State machine)
  const isSelectedDateWeekend = useMemo(() => {
    if (!selectedDate) return false;
    const d = new Date(selectedDate);
    const day = d.getDay();
    return day === 0 || day === 6;
  }, [selectedDate]);

  const isToday = selectedDate === todayDate;
  const currentLessonInfo = activeLesson === 1 ? status?.lesson_1 : status?.lesson_2;
  const isLessonWindowOpen = isToday && !isWeekendDay && Boolean(currentLessonInfo?.is_open);
  const isLessonStarted = Boolean(currentLessonInfo?.is_started);

  let pageState = "CLOSED";
  if (isSelectedDateWeekend) {
    pageState = "REST_DAY";
  } else if (isToday) {
    if (!isLessonWindowOpen) {
      pageState = "CLOSED";
    } else if (!isLessonStarted) {
      pageState = "NOT_STARTED";
    } else {
      pageState = "OPEN";
    }
  } else {
    pageState = "CLOSED";
  }

  // O'zgarishlar borligini tekshirish
  const hasChanges = useMemo(() => {
    if (pageState !== "OPEN") return false;
    for (const sid of Object.keys(draftMap)) {
      const cur = draftMap[sid];
      const init = initialMap[sid];
      if (!init) return true;
      if (cur.value !== init.value || cur.status !== init.status || cur.late_minutes !== init.late_minutes) {
        return true;
      }
    }
    return false;
  }, [draftMap, initialMap, pageState]);

  // Baho yoki kech qoldi qo'yilganlar soni
  const gradedCount = useMemo(() => {
    let count = 0;
    for (const sid of Object.keys(draftMap)) {
      const cur = draftMap[sid];
      if (cur && (cur.value !== null || cur.status === "late")) {
        count++;
      }
    }
    return count;
  }, [draftMap]);

  // Mavjud sinflar
  const uniqueGrades = useMemo(() => {
    const s = new Set();
    for (const g of gradesList) {
      if (g.grade && g.grade.trim()) s.add(g.grade.trim());
    }
    return Array.from(s).sort();
  }, [gradesList]);

  // Filtrlangan o'quvchilar
  const filteredStudents = useMemo(() => {
    return gradesList
      .filter((s) => {
        if (selectedGrade !== null && s.grade !== selectedGrade) return false;
        if (search && !matchStudentSearch(s, search)) return false;
        return true;
      })
      .sort((a, b) => {
        const nameA = formatName(a.last_name, a.first_name).toLowerCase();
        const nameB = formatName(b.last_name, b.first_name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [gradesList, selectedGrade, search]);

  // O'quvchi qatorini bosish (akkordeon ochish/yopish)
  const handleStudentClick = (studentId) => {
    if (pageState !== "OPEN") return;
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  // Baho tanlash (1..5)
  const handleSelectGrade = (studentId, val) => {
    setDraftMap((prev) => {
      const cur = prev[studentId] || {};
      const newVal = cur.value === val ? null : val;
      const newStatus = newVal !== null ? "present" : cur.late_minutes ? "late" : "absent";
      return {
        ...prev,
        [studentId]: {
          ...cur,
          value: newVal,
          status: newStatus,
          late_minutes: newStatus === "late" ? cur.late_minutes : null
        }
      };
    });
  };

  // Bahoni tozalash
  const handleClearGrade = (studentId) => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        value: null,
        status: "absent",
        late_minutes: null
      }
    }));
  };

  // Kech qoldi belgilash
  const handleOpenLateSheet = (studentId) => {
    const cur = draftMap[studentId] || {};
    setLateSheetStudent(studentId);
    setLateMinutesInput(cur.late_minutes ? String(cur.late_minutes) : "15");
  };

  const handleSaveLate = (e) => {
    e.preventDefault();
    const mins = parseInt(lateMinutesInput, 10);
    if (!mins || mins < 1 || mins > 600) {
      showToast("Kech qolish daqiqasi 1 dan 600 gacha bo'lishi shart", "warn");
      return;
    }

    setDraftMap((prev) => {
      const cur = prev[lateSheetStudent] || {};
      return {
        ...prev,
        [lateSheetStudent]: {
          ...cur,
          status: "late",
          late_minutes: mins
        }
      };
    });
    setLateSheetStudent(null);
  };

  // Saqlash (Bulk Save)
  const handleSaveAll = async () => {
    if (!hasChanges || isSaving) return;
    setIsSaving(true);
    try {
      const items = gradesList.map((s) => {
        const cur = draftMap[s.student_id] || { value: null, status: "absent", late_minutes: null };
        return {
          student_id: s.student_id,
          value: cur.value,
          status: cur.status,
          late_minutes: cur.late_minutes
        };
      });

      await apiRequest("/api/grades", {
        method: "PUT",
        body: {
          date: selectedDate,
          lesson: activeLesson,
          items
        }
      });

      showToast("Baholar saqlandi", "success");
      await loadGrades();
      await fetchStatus();
    } catch (err) {
      showToast(err.message || "Saqlashda xatolik yuz berdi", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Darsni boshlash
  const handleStartLesson = async (e) => {
    e.preventDefault();
    const cleanTopic = topicInput.trim();
    if (!cleanTopic) {
      showToast("Mavzuni kiriting", "warn");
      return;
    }

    setIsStartingLesson(true);
    try {
      await apiRequest("/api/lessons", {
        method: "POST",
        body: {
          lesson_no: activeLesson,
          topic: cleanTopic
        }
      });
      showToast("Dars boshlandi", "success");
      setStartLessonSheetOpen(false);
      await fetchStatus();
      await loadGrades();
    } catch (err) {
      showToast(err.message || "Darsni boshlashda xatolik", "error");
    } finally {
      setIsStartingLesson(false);
    }
  };

  // Oy sarlavhasi
  const currentMonthNum = parseInt(selectedDate.slice(5, 7), 10);
  const currentYearNum = parseInt(selectedDate.slice(0, 4), 10);
  const monthName = MONTH_NAMES_UZ[currentMonthNum - 1] || "";

  return (
    <div class="grading-page">
      {/* Ixcham tepa blok (B5: <= 168px) */}
      <div class="grading-top-compact">
        {/* Sarlavha va oy tanlash */}
        <div class="grading-header-row">
          <h2 class="home-title" style={{ margin: 0 }}>Baholash</h2>
          <button
            type="button"
            class="month-picker-btn"
            onClick={() => setMonthSheetOpen(true)}
          >
            <span>{monthName} {currentYearNum}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        {/* 5 kunlik hafta lentasi (B7) */}
        <WeekStrip
          selectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            setExpandedStudentId(null);
          }}
        />

        {/* Dars tanlash va hisob qatori (B5) */}
        <div class="grading-controls-row">
          <div class="grading-lesson-pills">
            <button
              type="button"
              class={`grading-lesson-pill ${activeLesson === 1 ? "active" : ""}`}
              onClick={() => {
                setActiveLesson(1);
                setExpandedStudentId(null);
              }}
            >
              1-dars
            </button>
            <button
              type="button"
              class={`grading-lesson-pill ${activeLesson === 2 ? "active" : ""}`}
              onClick={() => {
                setActiveLesson(2);
                setExpandedStudentId(null);
              }}
            >
              2-dars
            </button>
          </div>

          <span class="grading-count-chip">
            Baho qo'yilgan: {gradedCount} / {gradesList.length}
          </span>
        </div>
      </div>

      {/* Holat kartalari (B6) */}
      {pageState === "REST_DAY" && (
        <div class="grading-state-card">
          <span class="grading-state-title">Bugun dam olish kuni</span>
          <span class="grading-state-desc">Shanba va yakshanba kunlari darslar o'tilmaydi</span>
        </div>
      )}

      {pageState === "NOT_STARTED" && (
        <div class="grading-state-card">
          <span class="grading-state-title">Dars hali boshlanmagan</span>
          <span class="grading-state-desc">Baholash uchun avval dars mavzusini kiriting</span>
          <button
            type="button"
            class="start-lesson-btn"
            style={{ height: "40px", padding: "0 20px" }}
            onClick={() => {
              setTopicInput("");
              setStartLessonSheetOpen(true);
            }}
          >
            Darsni boshlash
          </button>
        </div>
      )}

      {/* Qidiruv va sinf filtri */}
      <div class="search-bar-wrap">
        <input
          type="text"
          class="search-input"
          placeholder="O'quvchini qidirish..."
          value={search}
          onInput={(e) => setSearch(e.target.value)}
        />
      </div>

      {uniqueGrades.length >= 2 && (
        <div class="filter-chips-row">
          <button
            type="button"
            class={`filter-chip ${selectedGrade === null ? "active" : ""}`}
            onClick={() => setSelectedGrade(null)}
          >
            Hammasi
          </button>
          {uniqueGrades.map((g) => (
            <button
              key={g}
              type="button"
              class={`filter-chip ${selectedGrade === g ? "active" : ""}`}
              onClick={() => setSelectedGrade(g)}
            >
              {g}-sinf
            </button>
          ))}
        </div>
      )}

      {/* O'quvchilar baholash ro'yxati */}
      <div class="grading-card-list">
        {isLoading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
            Yuklanmoqda...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
            O'quvchilar topilmadi
          </div>
        ) : (
          filteredStudents.map((student) => {
            const draft = draftMap[student.student_id] || {};
            const val = draft.value;
            const isLate = draft.status === "late";
            const isExpanded = expandedStudentId === student.student_id;

            return (
              <div key={student.student_id} class="grading-student-wrapper">
                {/* Asosiy qator (B12: ism 2 qatorga ruxsat, o'ng blok <= 112px) */}
                <div
                  class="grading-student-row"
                  onClick={() => handleStudentClick(student.student_id)}
                >
                  <div class="grading-student-left">
                    <Avatar
                      lastName={student.last_name}
                      firstName={student.first_name}
                      size={36}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <span class="grading-student-name">
                        {formatName(student.last_name, student.first_name)}
                      </span>
                      {student.lesson_slots === null && (
                        <span class="slot-badge-chip slot-badge-unset" title="Dars belgilanmagan">?</span>
                      )}
                    </div>
                  </div>

                  <div class="grading-student-right">
                    {val !== null && val !== undefined ? (
                      <span class={`grade-val-chip val-${val}`}>{val}</span>
                    ) : isLate ? (
                      <span class="grade-late-chip">
                        +{draft.late_minutes || 15} daq
                      </span>
                    ) : pageState === "OPEN" ? (
                      <span class="grade-neutral-chip">Baho yo'q</span>
                    ) : (
                      <span class="grade-absent-chip">Kelmadi</span>
                    )}
                  </div>
                </div>

                {/* Inline akkordeon (faqat dars ochiq bo'lsa va bosilgan bo'lsa) */}
                {isExpanded && pageState === "OPEN" && (
                  <div class="grading-accordion-panel">
                    <div class="grade-buttons-row">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          class={`btn-grade-val ${val === num ? "selected" : ""}`}
                          onClick={() => handleSelectGrade(student.student_id, num)}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <div class="grade-sub-actions">
                      <button
                        type="button"
                        class={`btn-late-action ${isLate ? "active" : ""}`}
                        onClick={() => handleOpenLateSheet(student.student_id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{isLate ? `+${draft.late_minutes} daq` : "Kech qoldi"}</span>
                      </button>

                      {(val !== null || isLate) && (
                        <button
                          type="button"
                          class="btn-clear-grade"
                          onClick={() => handleClearGrade(student.student_id)}
                        >
                          Bahoni tozalash
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Yagona Saqlash paneli (SaveDock) - Tab ustiga qadalgan (B4) */}
      {pageState === "OPEN" && (
        <SaveDock
          visible={true}
          disabled={!hasChanges}
          loading={isSaving}
          text={hasChanges ? "Saqlash" : "O'zgarishlar yo'q"}
          onSave={handleSaveAll}
        />
      )}

      {/* Dars boshlash Sheet */}
      <Sheet
        isOpen={startLessonSheetOpen}
        onClose={() => setStartLessonSheetOpen(false)}
        title={`${activeLesson}-dars mavzusi`}
      >
        <form class="start-lesson-form" onSubmit={handleStartLesson}>
          <input
            type="text"
            placeholder="Mavzuni kiriting"
            value={topicInput}
            onInput={(e) => setTopicInput(e.target.value)}
            required
            autoFocus
          />
          <button
            type="submit"
            class="start-lesson-btn"
            disabled={isStartingLesson || !topicInput.trim()}
          >
            {isStartingLesson ? "Boshlanmoqda..." : "Darsni boshlash"}
          </button>
        </form>
      </Sheet>

      {/* Kech qolish daqiqasini kiritish Sheet */}
      <Sheet
        isOpen={Boolean(lateSheetStudent)}
        onClose={() => setLateSheetStudent(null)}
        title="Kech qolish vaqti"
      >
        <form class="start-lesson-form" onSubmit={handleSaveLate}>
          <div class="form-group">
            <label class="form-label">Daqiqa (1 - 600)</label>
            <input
              type="number"
              class="form-input"
              value={lateMinutesInput}
              onInput={(e) => setLateMinutesInput(e.target.value)}
              min="1"
              max="600"
              required
            />
          </div>

          <div class="quick-amount-chips">
            <button
              type="button"
              class="quick-chip"
              onClick={() => setLateMinutesInput("15")}
            >
              +15 daqiqa
            </button>
            <button
              type="button"
              class="quick-chip"
              onClick={() => setLateMinutesInput("30")}
            >
              +30 daqiqa
            </button>
            <button
              type="button"
              class="quick-chip"
              onClick={() => setLateMinutesInput("45")}
            >
              +45 daqiqa
            </button>
          </div>

          <button type="submit" class="start-lesson-btn">
            Saqlash
          </button>
        </form>
      </Sheet>

      {/* Oy tanlash Sheet */}
      <MonthSheet
        isOpen={monthSheetOpen}
        onClose={() => setMonthSheetOpen(false)}
        currentYear={currentYearNum}
        selectedMonth={currentMonthNum}
        onSelectMonth={(monthNum, yearNum) => {
          const mStr = String(monthNum).padStart(2, "0");
          // Oyning birinchi dushanbasiga yoki 1-kuniga o'tish
          const newD = `${yearNum}-${mStr}-01`;
          setSelectedDate(newD);
        }}
      />
    </div>
  );
}
