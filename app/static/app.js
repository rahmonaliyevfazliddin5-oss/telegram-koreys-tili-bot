// ====================================================
// Telegram WebApp Integratsiyasi
// ====================================================
const tg = window.Telegram?.WebApp;

if (tg) {
  try {
    tg.ready();
    tg.expand();
    if (typeof tg.enableClosingConfirmation === "function") {
      tg.enableClosingConfirmation();
    }
    if (typeof tg.setHeaderColor === "function") {
      tg.setHeaderColor("#E4002B");
    }
    if (typeof tg.setBackgroundColor === "function") {
      tg.setBackgroundColor("#FFF7F8");
    }
  } catch (e) {
    console.warn("Telegram WebApp sozlamalarida xatolik:", e);
  }
}

// Haptic feedback boshqaruvi
const haptic = {
  impact: (style = "light") => {
    try {
      tg?.HapticFeedback?.impactOccurred(style);
    } catch (e) {}
  },
  notification: (type = "success") => {
    try {
      tg?.HapticFeedback?.notificationOccurred(type);
    } catch (e) {}
  },
  selection: () => {
    try {
      tg?.HapticFeedback?.selectionChanged();
    } catch (e) {}
  }
};

// ====================================================
// Xavfsiz SVG yaratish yordamchisi (Strict XSS Safety)
// ====================================================
const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgIcon(name, size = 18, strokeWidth = 2) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(strokeWidth));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  if (name === "chevron-right") {
    const poly = document.createElementNS(SVG_NS, "polyline");
    poly.setAttribute("points", "9 18 15 12 9 6");
    svg.appendChild(poly);
  } else if (name === "users") {
    const path1 = document.createElementNS(SVG_NS, "path");
    path1.setAttribute("d", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2");
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "9");
    circle.setAttribute("cy", "7");
    circle.setAttribute("r", "4");
    const path2 = document.createElementNS(SVG_NS, "path");
    path2.setAttribute("d", "M22 21v-2a4 4 0 0 0-3-3.87");
    const path3 = document.createElementNS(SVG_NS, "path");
    path3.setAttribute("d", "M16 3.13a4 4 0 0 1 0 7.75");
    svg.appendChild(path1);
    svg.appendChild(circle);
    svg.appendChild(path2);
    svg.appendChild(path3);
  } else if (name === "calendar") {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", "3");
    rect.setAttribute("y", "4");
    rect.setAttribute("width", "18");
    rect.setAttribute("height", "18");
    rect.setAttribute("rx", "2");
    rect.setAttribute("ry", "2");
    const line1 = document.createElementNS(SVG_NS, "line");
    line1.setAttribute("x1", "16");
    line1.setAttribute("y1", "2");
    line1.setAttribute("x2", "16");
    line1.setAttribute("y2", "6");
    const line2 = document.createElementNS(SVG_NS, "line");
    line2.setAttribute("x1", "8");
    line2.setAttribute("y1", "2");
    line2.setAttribute("x2", "8");
    line2.setAttribute("y2", "6");
    const line3 = document.createElementNS(SVG_NS, "line");
    line3.setAttribute("x1", "3");
    line3.setAttribute("y1", "10");
    line3.setAttribute("x2", "21");
    line3.setAttribute("y2", "10");
    svg.appendChild(rect);
    svg.appendChild(line1);
    svg.appendChild(line2);
    svg.appendChild(line3);
  } else if (name === "alert-circle") {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    const line1 = document.createElementNS(SVG_NS, "line");
    line1.setAttribute("x1", "12");
    line1.setAttribute("y1", "8");
    line1.setAttribute("x2", "12");
    line1.setAttribute("y2", "12");
    const line2 = document.createElementNS(SVG_NS, "line");
    line2.setAttribute("x1", "12");
    line2.setAttribute("y1", "16");
    line2.setAttribute("x2", "12.01");
    line2.setAttribute("y2", "16");
    svg.appendChild(circle);
    svg.appendChild(line1);
    svg.appendChild(line2);
  } else if (name === "check-circle") {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M22 11.08V12a10 10 0 1 1-5.93-9.14");
    const poly = document.createElementNS(SVG_NS, "polyline");
    poly.setAttribute("points", "22 4 12 14.01 9 11.01");
    svg.appendChild(path);
    svg.appendChild(poly);
  } else if (name === "book") {
    const path1 = document.createElementNS(SVG_NS, "path");
    path1.setAttribute("d", "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z");
    const path2 = document.createElementNS(SVG_NS, "path");
    path2.setAttribute("d", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z");
    svg.appendChild(path1);
    svg.appendChild(path2);
  }

  return svg;
}

// ====================================================
// Orqaga Harakatini Boshqarish
// ====================================================
async function handleBackNavigation() {
  haptic.impact("light");

  // 1. Ochiq o'qituvchi profil modalini yopish
  const teacherModal = document.getElementById("modalTeacherProfile");
  if (teacherModal && !teacherModal.classList.contains("hidden")) {
    teacherModal.classList.add("hidden");
    updateBackButton();
    return;
  }

  // 2. Ochiq profil modalini yopish
  const profileModal = document.getElementById("modalStudentProfile");
  if (profileModal && !profileModal.classList.contains("hidden")) {
    profileModal.classList.add("hidden");
    updateBackButton();
    return;
  }

  // 3. Ochiq bottom sheet yoki modalni yopish
  const anyOpenModal = document.querySelector(".modal-overlay:not(.hidden), .bottom-sheet-overlay:not(.hidden)");
  if (anyOpenModal) {
    closeAllSheetsAndModals();
    return;
  }

  // 4. Imtihon ichidagi o'quvchilar ro'yxatidan orqaga qaytish
  if (currentTabId === "tabGrades" && currentGradeKind === "exam" && selectedExam) {
    const canLeave = await confirmDiscardChangesIfNeeded();
    if (!canLeave) return;
    selectedExam = null;
    loadExamsList();
    updateBackButton();
    syncSaveBarForCurrentScreen();
    return;
  }

  // 5. Asosiy 4 sahifada orqaga bosilganda: adminlikdan chiqish
  const confirmed = await confirmAction("Admin paneldan chiqishni xohlaysizmi?", "Chiqish");
  if (confirmed) {
    try {
      await apiRequest("/api/admin/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout xatosi:", err);
    } finally {
      if (tg) tg.close();
    }
  }
}

function updateBackButton() {
  if (!tg?.BackButton) return;
  const teacherModal = document.getElementById("modalTeacherProfile");
  const isTeacherOpen = teacherModal && !teacherModal.classList.contains("hidden");
  const profileModal = document.getElementById("modalStudentProfile");
  const isProfileOpen = profileModal && !profileModal.classList.contains("hidden");
  const anyModal = document.querySelector(".modal-overlay:not(.hidden), .bottom-sheet-overlay:not(.hidden)");

  if (isTeacherOpen || isProfileOpen || anyModal || currentTabId !== "tabHome" || selectedExam) {
    tg.BackButton.show();
  } else {
    tg.BackButton.show();
  }
}

if (tg?.BackButton) {
  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    handleBackNavigation();
  });
}

document.getElementById("btnHeaderBack")?.addEventListener("click", () => {
  handleBackNavigation();
});

document.getElementById("btnUnauthorizedClose")?.addEventListener("click", () => {
  haptic.impact("light");
  if (tg) tg.close();
});

document.getElementById("btnBlockedClose")?.addEventListener("click", () => {
  haptic.impact("light");
  if (tg) tg.close();
});

// ====================================================
// Toast Xabarnomalar
// ====================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 2600);
}

// In-App Tasdiqlash Modali (Confirm Modal)
function confirmAction(message, title = "Tasdiqlang") {
  return new Promise((resolve) => {
    haptic.impact("medium");

    const modal = document.getElementById("modalConfirm");
    const msgEl = document.getElementById("confirmMessage");
    const titleEl = document.getElementById("confirmTitle");
    const btnCancel = document.getElementById("btnConfirmCancel");
    const btnOk = document.getElementById("btnConfirmOk");

    if (!modal || !msgEl || !titleEl || !btnCancel || !btnOk) {
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove("hidden");
    updateBackButton();

    const cleanup = () => {
      modal.classList.add("hidden");
      btnCancel.onclick = null;
      btnOk.onclick = null;
      updateBackButton();
    };

    btnCancel.onclick = () => {
      haptic.impact("light");
      cleanup();
      resolve(false);
    };

    btnOk.onclick = () => {
      haptic.impact("medium");
      cleanup();
      resolve(true);
    };
  });
}

function closeAllSheetsAndModals() {
  document.querySelectorAll(".modal-overlay, .bottom-sheet-overlay").forEach((el) => {
    el.classList.add("hidden");
  });
  updateBackButton();
}

document.querySelectorAll(".bottom-sheet-overlay, .modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("bottom-sheet-backdrop") ||
      e.target.classList.contains("modal-backdrop") ||
      e.target.classList.contains("sheet-handle")
    ) {
      haptic.impact("light");
      closeAllSheetsAndModals();
    }
  });
});

// ====================================================
// Telegram InitData va API So'rovlari
// ====================================================
const initData = tg?.initData || "";

async function apiRequest(endpoint, options = {}) {
  const headers = {
    Authorization: `tma ${initData}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  try {
    const response = await fetch(endpoint, { ...options, headers });
    if (response.status === 401) {
      showUnauthorized();
      throw new Error("Ruxsat berilmagan");
    }
    if (response.status === 403) {
      const err = await response.json().catch(() => ({ detail: "Dars oynasi yopiq yoki ruxsat yo'q" }));
      throw new Error(err.detail || "Ruxsat etilmagan");
    }
    if (response.status === 409) {
      const err = await response.json().catch(() => ({ detail: "Avval dars mavzusini kiriting" }));
      throw new Error(err.detail || "Avval dars mavzusini kiriting");
    }
    if (response.status === 422) {
      const err = await response.json().catch(() => ({ detail: "Noto'g'ri ma'lumot kiritildi" }));
      throw new Error(err.detail || "Noto'g'ri ma'lumot kiritildi");
    }
    if (response.status === 423) {
      showBlocked(1800);
      throw new Error("Admin kirish bloklangan");
    }
    if (response.status >= 500) {
      const err = await response.json().catch(() => ({ detail: "Serverda xatolik yuz berdi" }));
      throw new Error(err.detail || "Serverda xatolik yuz berdi");
    }
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }));
      throw new Error(err.detail || "Xatolik yuz berdi");
    }
    return await response.json();
  } catch (err) {
    let msg = err.message || "Xatolik yuz berdi";
    if (err.name === "TypeError" && err.message && err.message.toLowerCase().includes("fetch")) {
      msg = "Tarmoq xatosi: server bilan aloqa mavjud emas";
    }
    if (err.message !== "Ruxsat berilmagan") {
      haptic.notification("error");
      showToast(msg, "error");
    }
    console.error("API xatosi:", msg);
    throw err;
  }
}

function showUnauthorized() {
  document.getElementById("mainApp")?.classList.add("hidden");
  document.getElementById("bottomNav")?.classList.add("hidden");
  document.getElementById("fabAdd")?.classList.add("hidden");
  document.getElementById("unauthorizedView")?.classList.remove("hidden");
}

function showBlocked(ttlSeconds) {
  document.getElementById("mainApp")?.classList.add("hidden");
  document.getElementById("bottomNav")?.classList.add("hidden");
  document.getElementById("fabAdd")?.classList.add("hidden");
  const blockedView = document.getElementById("blockedView");
  blockedView?.classList.remove("hidden");

  let remaining = ttlSeconds || 1800;
  const timerEl = document.getElementById("blockedTimer");

  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      location.reload();
      return;
    }
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    if (timerEl) {
      timerEl.textContent = `Qolgan vaqt: ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
  }, 1000);
}

// ====================================================
// Tablarni Boshqarish (5 ta Tab: Bosh sahifa, O'quvchilar, Davomat, Baholash, Sozlamalar)
// ====================================================
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");
const fabAdd = document.getElementById("fabAdd");
const fabAddExam = document.getElementById("fabAddExam");
let currentTabId = "tabHome";

let isAttDirty = false;
let isGradeDailyDirty = false;
let isGradeExamDirty = false;

function hasUnsavedChanges() {
  if (currentTabId === "tabGrades") {
    if (currentGradeKind === "daily" && isGradeDailyDirty) return true;
    if (currentGradeKind === "exam" && selectedExam && isGradeExamDirty) return true;
  }
  return false;
}

async function confirmDiscardChangesIfNeeded() {
  if (!hasUnsavedChanges()) return true;
  const proceed = await confirmAction(
    "Saqlanmagan o'zgarishlar bor. Haqiqatan ham sahifadan chiqmoqchimisiz?",
    "Saqlanmagan o'zgarishlar"
  );
  if (proceed) {
    isAttDirty = false;
    isGradeDailyDirty = false;
    isGradeExamDirty = false;
  }
  return proceed;
}

async function switchTab(tabId) {
  if (tabId !== currentTabId) {
    const canLeave = await confirmDiscardChangesIfNeeded();
    if (!canLeave) return;
  }

  currentTabId = tabId;

  navItems.forEach((n) => {
    if (n.getAttribute("data-tab") === tabId) {
      n.classList.add("active");
    } else {
      n.classList.remove("active");
    }
  });

  tabContents.forEach((t) => {
    if (t.id === tabId) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  // Header sarlavhasini yangilash
  const headerTitle = document.getElementById("headerTitle");
  if (headerTitle) {
    if (tabId === "tabHome") headerTitle.textContent = "Kurs Boshqaruvi";
    else if (tabId === "tabStudents") headerTitle.textContent = "O'quvchilar";
    else if (tabId === "tabGrades") headerTitle.textContent = "Baholash";
    else if (tabId === "tabSettings") headerTitle.textContent = "Sozlamalar";
  }

  // FAB ko'rinishi
  if (currentTabId === "tabStudents") {
    fabAdd?.classList.remove("hidden");
    fabAddExam?.classList.add("hidden");
  } else if (currentTabId === "tabGrades" && currentGradeKind === "exam" && !selectedExam) {
    fabAdd?.classList.add("hidden");
    fabAddExam?.classList.remove("hidden");
  } else {
    fabAdd?.classList.add("hidden");
    fabAddExam?.classList.add("hidden");
  }

  updateBackButton();

  if (tabId === "tabHome") loadHomeDashboard();
  else if (tabId === "tabStudents") loadStudents();
  else if (tabId === "tabGrades") {
    renderGradesWeekStrip();
    if (currentGradeKind === "daily") {
      await loadGrades();
    } else {
      await loadExamsList();
    }
  }

  syncSaveBarForCurrentScreen();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    haptic.selection();
    const tabId = item.getAttribute("data-tab");
    switchTab(tabId);
  });
});

fabAdd?.addEventListener("click", () => {
  haptic.impact("light");
  if (currentTabId === "tabStudents") {
    openAddStudentModal();
  }
});

fabAddExam?.addEventListener("click", () => {
  haptic.impact("light");
  openStartExamSheet();
});

// Klaviatura ochilganda tab panelni yashirish
document.addEventListener("focusin", (e) => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
    document.body.classList.add("keyboard-open");
  }
});
document.addEventListener("focusout", (e) => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
    document.body.classList.remove("keyboard-open");
  }
});

// ====================================================
// Sanalar va Vaqt Formati (24-soatlik format, Asia/Tashkent)
// ====================================================
const MONTH_NAMES_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

const WEEKDAYS_UZ = [
  "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"
];

function getTodayString() {
  if (systemStatus && systemStatus.date) {
    return systemStatus.date;
  }
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

// Universal Ism va Formatlash
function formatStudentFullName(st) {
  if (!st) return "";
  const firstName = (st.first_name || "").trim();
  const lastName = (st.last_name || "").trim();
  if (lastName && lastName !== "None" && lastName !== "null" && lastName !== "undefined") {
    return `${lastName} ${firstName}`.trim();
  }
  if (firstName && firstName !== "None" && firstName !== "null" && firstName !== "undefined") {
    return firstName;
  }
  if (st.student_name) return String(st.student_name).trim();
  if (st.name) return String(st.name).trim();
  return "";
}

function normalizeSearchText(str) {
  if (!str) return "";
  return String(str)
    .replace(/[‘’’ʻ`]/g, "'")
    .toLowerCase()
    .trim();
}

function matchStudentSearchAndClass(st, query, selectedClass) {
  if (selectedClass && selectedClass !== "all") {
    if (!st.grade || String(st.grade).trim() !== String(selectedClass).trim()) {
      return false;
    }
  }

  if (!query) return true;

  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const combined = normalizeSearchText(
    `${st.last_name || ""} ${st.first_name || ""} ${st.student_name || ""} ${st.name || ""} ${st.grade || ""}`
  );
  return tokens.every(token => combined.includes(token));
}

function sortStudentsAlphabetically(students) {
  return [...students].sort((a, b) => {
    const lastA = (a.last_name || "").trim();
    const lastB = (b.last_name || "").trim();
    const firstA = (a.first_name || "").trim();
    const firstB = (b.first_name || "").trim();

    // Natural sort: primary key is last_name if present, else first_name
    const keyA = (lastA && lastA !== "None" && lastA !== "null") ? lastA : firstA;
    const keyB = (lastB && lastB !== "None" && lastB !== "null") ? lastB : firstB;

    const cmp = keyA.localeCompare(keyB, "uz", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return firstA.localeCompare(firstB, "uz", { sensitivity: "base" });
  });
}

function getDuplicateNameSet(students) {
  const counts = new Map();
  for (const st of students) {
    const name = formatStudentFullName(st).toLowerCase();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const duplicates = new Set();
  counts.forEach((count, name) => {
    if (count > 1) duplicates.add(name);
  });
  return duplicates;
}

function renderClassChips(containerId, students, selectedClass, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();

  const classesSet = new Set();
  for (const st of students) {
    if (st.grade && String(st.grade).trim()) {
      classesSet.add(String(st.grade).trim());
    }
  }

  const sortedClasses = Array.from(classesSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `class-chip ${selectedClass === "all" ? "active" : ""}`;
  allChip.textContent = "Hammasi";
  allChip.onclick = () => {
    haptic.selection();
    onSelect("all");
  };
  container.appendChild(allChip);

  sortedClasses.forEach(cls => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `class-chip ${selectedClass === cls ? "active" : ""}`;
    chip.textContent = cls;
    chip.onclick = () => {
      haptic.selection();
      onSelect(cls);
    };
    container.appendChild(chip);
  });
}

// Global Save Bar Komponenti
let isGlobalSaveInProgress = false;

function removeGlobalSaveBar() {
  const existing = document.getElementById("globalSaveBar");
  if (existing) {
    existing.remove();
  }
}

function renderGlobalSaveBar({ type, onClick, isEnabled, isClosedWindow }) {
  removeGlobalSaveBar();

  const container = document.getElementById("globalSaveContainer") || document.body;
  const bar = document.createElement("div");
  bar.id = "globalSaveBar";
  bar.className = "global-save-bar";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "btnGlobalSaveAction";
  btn.className = "btn btn-primary btn-block btn-save-action";

  if (isClosedWindow) {
    btn.classList.add("is-disabled-window");
    btn.disabled = true;
  } else if (!isEnabled) {
    btn.disabled = true;
  }

  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
    <span id="btnGlobalSaveText">Saqlash</span>
  `;

  btn.onclick = async () => {
    if (isGlobalSaveInProgress || btn.disabled) return;
    isGlobalSaveInProgress = true;
    btn.disabled = true;
    const textEl = document.getElementById("btnGlobalSaveText");
    if (textEl) {
      textEl.innerHTML = '<span class="btn-spinner"></span>Saqlanmoqda...';
    }
    try {
      await onClick();
    } finally {
      isGlobalSaveInProgress = false;
      const t = document.getElementById("btnGlobalSaveText");
      if (t) t.textContent = "Saqlash";
      syncSaveBarForCurrentScreen();
    }
  };

  bar.appendChild(btn);
  container.appendChild(bar);
}

function syncSaveBarForCurrentScreen() {
  if (currentTabId === "tabGrades") {
    if (currentGradeKind === "daily") {
      const isToday = currentGradeDate === getTodayString();
      const isWindowOpen = isLessonWindowOpen(currentGradeLesson) && isToday && !systemStatus.is_weekend;
      const isStarted = currentGradeIsStarted;
      const isClosed = !isWindowOpen || !isStarted;
      const hasChanges = isGradeDailyDirty;

      renderGlobalSaveBar({
        type: "daily_grades",
        onClick: executeSaveDailyGrades,
        isEnabled: !isClosed && hasChanges,
        isClosedWindow: isClosed
      });
    } else if (currentGradeKind === "exam" && selectedExam) {
      const isToday = currentGradeDate === getTodayString();
      const isWindowOpen = isLessonWindowOpen(selectedExam.lesson_no) && isToday && !systemStatus.is_weekend;
      const isClosed = !isWindowOpen;
      const hasChanges = isGradeExamDirty;

      renderGlobalSaveBar({
        type: "exam_grades",
        onClick: executeSaveExamGrades,
        isEnabled: !isClosed && hasChanges,
        isClosedWindow: isClosed
      });
    } else {
      removeGlobalSaveBar();
    }
  } else {
    removeGlobalSaveBar();
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${d}-${MONTH_NAMES_UZ[m].toLowerCase()} ${y}`;
}

function formatDateTime24(isoStr) {
  if (!isoStr) return "";
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return isoStr;

    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    const hours = String(dt.getHours()).padStart(2, "0");
    const mins = String(dt.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${hours}:${mins}`;
  } catch (e) {
    return isoStr;
  }
}

function formatLateMinutes(minutes) {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) {
    return `+${minutes} daqiqa kech qoldi`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) {
    return `+${hours} soat kech qoldi`;
  }
  return `+${hours} soat ${rem} daqiqa kech qoldi`;
}

// Ism bosh harflari va qizil-oq uslubidagi gradientlar
const AVATAR_COLORS = [
  "linear-gradient(135deg, #E4002B, #FF4D6D)",
  "linear-gradient(135deg, #BE123C, #FB7185)",
  "linear-gradient(135deg, #D97706, #FBBF24)",
  "linear-gradient(135deg, #059669, #34D399)",
  "linear-gradient(135deg, #4338CA, #818CF8)",
  "linear-gradient(135deg, #C026D3, #E879F9)"
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getInitials(first, last) {
  const f = first ? first.charAt(0).toUpperCase() : "";
  const l = last ? last.charAt(0).toUpperCase() : "";
  return `${f}${l}` || "O";
}

// ====================================================
// Status Xizmati: GET /api/status (har 30s va fokusda)
// ====================================================
let systemStatus = {
  is_weekend: false,
  lesson1_open: false,
  lesson2_open: false,
  current_time: "00:00",
  server_time: "",
  active_lesson: 1,
  is_blocked: false,
  block_ttl: 0,
  lesson_1: null,
  lesson_2: null,
  exams_today: []
};

let hasUserSelectedAttDate = false;
let hasUserSelectedGradeDate = false;

async function fetchStatus() {
  try {
    const data = await apiRequest("/api/status");
    if (data) {
      systemStatus.is_weekend = Boolean(data.is_weekend);
      systemStatus.current_time = data.current_time || data.server_time || "";
      systemStatus.server_time = data.server_time || "";
      systemStatus.date = data.date || "";
      systemStatus.is_blocked = Boolean(data.is_blocked);
      systemStatus.block_ttl = data.block_ttl || 0;
      systemStatus.active_lesson = data.active_lesson || 1;
      systemStatus.lesson_1 = data.lesson_1 || null;
      systemStatus.lesson_2 = data.lesson_2 || null;
      systemStatus.exams = data.exams || [];
      systemStatus.exams_today = data.exams || [];

      if (data.date) {
        if (!hasUserSelectedAttDate) {
          currentAttDate = data.date;
          const [y, m] = data.date.split("-").map(Number);
          currentAttCalYear = y;
          currentAttCalMonth = m - 1;
        }
        if (!hasUserSelectedGradeDate) {
          currentGradeDate = data.date;
          const [y, m] = data.date.split("-").map(Number);
          currentGradeCalYear = y;
          currentGradeCalMonth = m - 1;
        }
      }

      if (data.lesson_1) {
        systemStatus.lesson1_open = Boolean(data.lesson_1.is_open);
      } else {
        systemStatus.lesson1_open = Boolean(data.lesson1_open);
      }

      if (data.lesson_2) {
        systemStatus.lesson2_open = Boolean(data.lesson_2.is_open);
      } else {
        systemStatus.lesson2_open = Boolean(data.lesson2_open);
      }

      if (systemStatus.is_blocked) {
        showBlocked(systemStatus.block_ttl);
        return;
      }
    }
  } catch (e) {
    console.warn("Status yuklashda xatolik:", e);
  } finally {
    const timeBadge = document.getElementById("headerTimeBadge");
    if (timeBadge && systemStatus.current_time) {
      timeBadge.textContent = systemStatus.current_time;
    }
    updateTodayCardsUI();
    updateWindowStatusUI();
    if (currentTabId === "tabHome") {
      updateHomeStatusBanner();
    }
    syncSaveBarForCurrentScreen();
  }
}

setInterval(fetchStatus, 30000);
window.addEventListener("focus", () => {
  fetchStatus();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    fetchStatus();
  }
});

function isLessonWindowOpen(lesson) {
  if (systemStatus.is_weekend) return false;
  if (lesson === 1) return systemStatus.lesson1_open;
  if (lesson === 2) return systemStatus.lesson2_open;
  return false;
}

// Bugungi darslar 3 ta kartasini holatiga qarab yangilash
function updateTodayCardsUI() {
  // 1-dars karta
  const card1 = document.getElementById("cardTodayLesson1");
  const badge1 = document.getElementById("badgeLesson1");
  const topic1 = document.getElementById("topicLesson1");

  const l1 = systemStatus.lesson_1;
  const isL1Open = systemStatus.lesson1_open && !systemStatus.is_weekend;

  if (card1 && badge1 && topic1) {
    badge1.className = "lesson-card-badge";
    if (systemStatus.is_weekend || !isL1Open) {
      card1.classList.add("closed");
      badge1.classList.add("badge-closed");
      badge1.textContent = "Yopiq";
      topic1.textContent = l1?.topic ? l1.topic : "Oyna: 07:00 - 12:00";
    } else {
      card1.classList.remove("closed");
      if (l1?.started) {
        badge1.classList.add("badge-started");
        badge1.textContent = "Boshlangan";
        topic1.textContent = l1.topic || "Mavzu kiritilgan";
      } else {
        badge1.classList.add("badge-not-started");
        badge1.textContent = "Boshlanmagan";
        topic1.textContent = "Oyna: 07:00 - 12:00";
      }
    }
  }

  // 2-dars karta
  const card2 = document.getElementById("cardTodayLesson2");
  const badge2 = document.getElementById("badgeLesson2");
  const topic2 = document.getElementById("topicLesson2");

  const l2 = systemStatus.lesson_2;
  const isL2Open = systemStatus.lesson2_open && !systemStatus.is_weekend;

  if (card2 && badge2 && topic2) {
    badge2.className = "lesson-card-badge";
    if (systemStatus.is_weekend || !isL2Open) {
      card2.classList.add("closed");
      badge2.classList.add("badge-closed");
      badge2.textContent = "Yopiq";
      topic2.textContent = l2?.topic ? l2.topic : "Oyna: 15:30 - 20:00";
    } else {
      card2.classList.remove("closed");
      if (l2?.started) {
        badge2.classList.add("badge-started");
        badge2.textContent = "Boshlangan";
        topic2.textContent = l2.topic || "Mavzu kiritilgan";
      } else {
        badge2.classList.add("badge-not-started");
        badge2.textContent = "Boshlanmagan";
        topic2.textContent = "Oyna: 15:30 - 20:00";
      }
    }
  }

  // Imtihon karta
  const cardExam = document.getElementById("cardTodayExam");
  const badgeExam = document.getElementById("badgeExam");
  const topicExam = document.getElementById("topicExam");

  const anyOpen = (isL1Open || isL2Open) && !systemStatus.is_weekend;
  const exams = systemStatus.exams || systemStatus.exams_today || [];
  const examsCount = exams.length;

  if (cardExam && badgeExam && topicExam) {
    badgeExam.className = "lesson-card-badge";
    if (systemStatus.is_weekend || !anyOpen) {
      cardExam.classList.add("closed");
      badgeExam.classList.add("badge-closed");
      badgeExam.textContent = "Yopiq";
      topicExam.textContent = examsCount > 0 ? `${examsCount} ta imtihon o'tkazildi` : "Oraliq va yakuniy testlar";
    } else {
      cardExam.classList.remove("closed");
      if (examsCount > 0) {
        badgeExam.classList.add("badge-started");
        badgeExam.textContent = "Boshlangan";
        if (examsCount === 1) {
          topicExam.textContent = exams[0].name;
        } else {
          topicExam.textContent = `${examsCount} ta imtihon ochilgan`;
        }
      } else {
        badgeExam.classList.add("badge-not-started");
        badgeExam.textContent = "Boshlanmagan";
        topicExam.textContent = "Oraliq va yakuniy testlar";
      }
    }
  }
}

function updateWindowStatusUI() {
  const isAttToday = currentAttDate === getTodayString();
  const isAttOpen = isLessonWindowOpen(currentAttLesson) && isAttToday;

  // Davomat oynasi holati
  const attBanner = document.getElementById("attWindowBanner");
  const attText = document.getElementById("attStatusText");

  if (attBanner && attText) {
    attBanner.classList.remove("status-open", "status-closed");
    if (!isAttToday) {
      attBanner.classList.add("status-closed");
      attText.textContent = `Faqat ko'rish rejimi (${currentAttDate}). O'zgartirish taqiqlangan.`;
    } else if (systemStatus.is_weekend) {
      attBanner.classList.add("status-closed");
      attText.textContent = `Dam olish kuni (Shanba/Yakshanba). Davomat yopiq. Vaqt: ${systemStatus.current_time}`;
    } else if (isAttOpen) {
      attBanner.classList.add("status-open");
      attText.textContent = `${currentAttLesson}-dars oynasi ochiq (${currentAttLesson === 1 ? "07:00 - 12:00" : "15:30 - 20:00"}). Vaqt: ${systemStatus.current_time}`;
    } else {
      attBanner.classList.add("status-closed");
      attText.textContent = `${currentAttLesson}-dars oynasi yopiq (${currentAttLesson === 1 ? "07:00 - 12:00" : "15:30 - 20:00"}). Vaqt: ${systemStatus.current_time}`;
    }
  }

  const isGradeToday = currentGradeDate === getTodayString();
  const isGradeOpen = isLessonWindowOpen(currentGradeLesson) && isGradeToday;

  const gradeBanner = document.getElementById("gradeWindowBanner");
  const gradeText = document.getElementById("gradeStatusText");

  if (gradeBanner && gradeText) {
    gradeBanner.classList.remove("status-open", "status-closed");
    if (!isGradeToday) {
      gradeBanner.classList.add("status-closed");
      gradeText.textContent = `Faqat ko'rish rejimi (${currentGradeDate}). O'zgartirish taqiqlangan.`;
    } else if (systemStatus.is_weekend) {
      gradeBanner.classList.add("status-closed");
      gradeText.textContent = `Dam olish kuni (Shanba/Yakshanba). Baholash yopiq. Vaqt: ${systemStatus.current_time}`;
    } else if (isGradeOpen) {
      gradeBanner.classList.add("status-open");
      gradeText.textContent = `${currentGradeLesson}-dars oynasi ochiq (${currentGradeLesson === 1 ? "07:00 - 12:00" : "15:30 - 20:00"}). Vaqt: ${systemStatus.current_time}`;
    } else {
      gradeBanner.classList.add("status-closed");
      gradeText.textContent = `${currentGradeLesson}-dars oynasi yopiq (${currentGradeLesson === 1 ? "07:00 - 12:00" : "15:30 - 20:00"}). Vaqt: ${systemStatus.current_time}`;
    }
  }
}

// ====================================================
// 1. BOSH SAHIFA (HOME DASHBOARD)
// ====================================================
function updateHomeStatusBanner() {
  const banner = document.getElementById("homeStatusBanner");
  const title = document.getElementById("homeStatusTitle");
  const sub = document.getElementById("homeStatusSub");

  if (!banner || !title || !sub) return;

  banner.classList.remove("status-open", "status-closed");

  if (systemStatus.is_weekend) {
    banner.classList.add("status-closed");
    title.textContent = "Bugun dam olish kuni (Dars oynalari yopiq)";
    sub.textContent = `Toshkent vaqti: ${systemStatus.current_time} (Shanba/Yakshanba)`;
  } else if (systemStatus.lesson1_open) {
    banner.classList.add("status-open");
    title.textContent = "1-dars oynasi ochiq (07:00 - 12:00)";
    sub.textContent = `Toshkent vaqti: ${systemStatus.current_time} | Davomat va baholash faol`;
  } else if (systemStatus.lesson2_open) {
    banner.classList.add("status-open");
    title.textContent = "2-dars oynasi ochiq (15:30 - 20:00)";
    sub.textContent = `Toshkent vaqti: ${systemStatus.current_time} | Davomat va baholash faol`;
  } else {
    banner.classList.add("status-closed");
    title.textContent = "Dars oynalari hozircha yopiq";
    sub.textContent = `Toshkent vaqti: ${systemStatus.current_time} (1-dars 07:00, 2-dars 15:45)`;
  }
}

async function loadHomeDashboard() {
  updateHomeStatusBanner();
  updateTodayCardsUI();
  await Promise.all([
    loadHomeAttendanceRing(),
    loadHomeTop3Rating(),
    loadHomeSources()
  ]);
}

// Halqali davomat kartasi (Circular Progress Ring)
async function loadHomeAttendanceRing() {
  const ringFill = document.getElementById("ringProgressCircle");
  const percentText = document.getElementById("ringPercentVal");
  const presentEl = document.getElementById("ringPresentCount");
  const absentEl = document.getElementById("ringAbsentCount");
  const totalEl = document.getElementById("ringTotalCount");
  const ringDateSub = document.getElementById("homeRingDateSub");
  const lessonBadge = document.getElementById("homeRingLessonBadge");

  const todayStr = getTodayString();
  const activeLesson = systemStatus.active_lesson || 1;

  if (ringDateSub) ringDateSub.textContent = formatDisplayDate(todayStr);
  if (lessonBadge) lessonBadge.textContent = `${activeLesson}-dars ${activeLesson === 1 ? "07:00" : "15:45"}`;

  try {
    let isStarted = false;
    try {
      const lessonRes = await apiRequest(`/api/lessons?date=${todayStr}&lesson=${activeLesson}`);
      isStarted = Boolean(lessonRes && lessonRes.topic);
    } catch (_) {
      isStarted = false;
    }

    const res = await apiRequest(`/api/grades?date=${todayStr}&lesson=${activeLesson}&kind=daily`);
    const items = Array.isArray(res) ? res : (res?.items || []);

    const total = items.length;
    let present = 0;
    let absent = 0;
    let percentage = 0;

    if (!isStarted || systemStatus.is_weekend) {
      if (ringDateSub) ringDateSub.textContent = `${formatDisplayDate(todayStr)} • Olinmagan`;
      if (presentEl) presentEl.textContent = "0";
      if (absentEl) absentEl.textContent = "0";
      if (totalEl) totalEl.textContent = String(total);
      if (percentText) percentText.textContent = "0%";
      if (ringFill) {
        ringFill.style.stroke = "var(--color-border)";
        ringFill.style.strokeDashoffset = "289";
      }
      return;
    }

    present = items.filter((s) => s.status === "present" || s.status === "late").length;
    absent = Math.max(0, total - present);
    percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    if (ringDateSub) {
      ringDateSub.textContent = `${formatDisplayDate(todayStr)} • Jonli`;
    }

    if (presentEl) presentEl.textContent = String(present);
    if (absentEl) absentEl.textContent = String(absent);
    if (totalEl) totalEl.textContent = String(total);
    if (percentText) percentText.textContent = `${percentage}%`;

    if (ringFill) {
      ringFill.style.stroke = "var(--primary-red)";
      const circumference = 289;
      const offset = circumference - (percentage / 100) * circumference;
      ringFill.style.strokeDashoffset = String(offset);
    }
  } catch (err) {
    console.warn("Halqali davomatni yuklashda xato:", err);
  }
}

// Reyting kartasi (TOP-3)
async function loadHomeTop3Rating() {
  const container = document.getElementById("homeTop3List");
  if (!container) return;

  try {
    const data = await apiRequest("/api/students/rating?limit=3");
    container.replaceChildren();

    if (!data || data.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "top3-empty";
      emptyDiv.textContent = "Hozircha ball to'plagan o'quvchilar yo'q";
      container.appendChild(emptyDiv);
      return;
    }

    data.slice(0, 3).forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "top3-item-row";
      row.style.cursor = "pointer";

      const rankBadge = document.createElement("div");
      const rankNum = item.rank || idx + 1;
      rankBadge.className = `rank-badge rank-${Math.min(rankNum, 3)}`;
      rankBadge.textContent = String(rankNum);

      const nameWrap = document.createElement("div");
      nameWrap.className = "top3-name-wrap";

      const name = document.createElement("div");
      name.className = "top3-name";
      name.textContent = `${item.first_name || ""} ${item.last_name || ""}`.trim();

      const grade = document.createElement("div");
      grade.className = "top3-grade";
      grade.textContent = item.grade ? `Sinf: ${item.grade}` : "O'quvchi";

      nameWrap.appendChild(name);
      nameWrap.appendChild(grade);

      const scoreBadge = document.createElement("div");
      scoreBadge.className = "top3-score-badge";
      scoreBadge.textContent = `${item.total_score || 0} ball`;

      row.appendChild(rankBadge);
      row.appendChild(nameWrap);
      row.appendChild(scoreBadge);

      row.onclick = () => {
        haptic.impact("light");
        openStudentProfile({
          id: item.student_id,
          first_name: item.first_name,
          last_name: item.last_name,
          grade: item.grade
        });
      };

      container.appendChild(row);
    });
  } catch (err) {
    container.replaceChildren();
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "top3-empty";
    emptyDiv.textContent = "Reyting ma'lumotlari mavjud emas";
    container.appendChild(emptyDiv);
  }
}

// Manbalar kartasi (Home)
async function loadHomeSources() {
  const container = document.getElementById("homeSourcesList");
  if (!container) return;

  try {
    const sources = await apiRequest("/api/sources");
    container.replaceChildren();

    if (!sources || sources.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "top3-empty";
      emptyDiv.textContent = "Hozircha manbalar qo'shilmagan";
      container.appendChild(emptyDiv);
      return;
    }

    sources.slice(0, 4).forEach((src) => {
      const item = document.createElement("div");
      item.className = "home-source-item";

      const title = document.createElement("div");
      title.className = "home-source-title";
      title.textContent = src.title_uz;

      const chevron = createSvgIcon("chevron-right", 16);

      item.appendChild(title);
      item.appendChild(chevron);

      item.onclick = () => {
        haptic.impact("light");
        openEditSourceModal(src);
      };

      container.appendChild(item);
    });
  } catch (err) {}
}

document.getElementById("btnHomeAddSource")?.addEventListener("click", () => {
  haptic.impact("light");
  openAddSourceModal();
});

// ====================================================
// DARSNI BOSHLASH VA IMTIHON OCHISH (Home 3 Karta)
// ====================================================
const sheetStartLesson = document.getElementById("sheetStartLesson");
const formStartLesson = document.getElementById("formStartLesson");
const lessonTopicInput = document.getElementById("lessonTopicInput");
const lessonTopicCounter = document.getElementById("lessonTopicCounter");
const startLessonNo = document.getElementById("startLessonNo");
const startLessonId = document.getElementById("startLessonId");
const sheetStartLessonTitle = document.getElementById("sheetStartLessonTitle");
const btnSubmitStartLesson = document.getElementById("btnSubmitStartLesson");

function openStartLessonSheet(lessonNo) {
  const isL1Open = systemStatus.lesson1_open && !systemStatus.is_weekend;
  const isL2Open = systemStatus.lesson2_open && !systemStatus.is_weekend;
  const isOpen = lessonNo === 1 ? isL1Open : isL2Open;

  if (!isOpen) {
    showToast(`${lessonNo}-dars oynasi hozir yopiq`, "error");
    return;
  }

  const lessonData = lessonNo === 1 ? systemStatus.lesson_1 : systemStatus.lesson_2;

  startLessonNo.value = String(lessonNo);
  startLessonId.value = lessonData?.lesson_id ? String(lessonData.lesson_id) : "";
  sheetStartLessonTitle.textContent = `${lessonNo}-dars ${lessonNo === 1 ? "07:00" : "15:45"}`;

  if (lessonData?.started && lessonData?.topic) {
    lessonTopicInput.value = lessonData.topic;
    btnSubmitStartLesson.textContent = "Mavzuni yangilash";
  } else {
    lessonTopicInput.value = "";
    btnSubmitStartLesson.textContent = "Darsni boshlash";
  }

  lessonTopicCounter.textContent = `${lessonTopicInput.value.length} / 300`;
  sheetStartLesson?.classList.remove("hidden");
  updateBackButton();
}

document.getElementById("cardTodayLesson1")?.addEventListener("click", () => {
  haptic.impact("light");
  openStartLessonSheet(1);
});

document.getElementById("cardTodayLesson2")?.addEventListener("click", () => {
  haptic.impact("light");
  openStartLessonSheet(2);
});

lessonTopicInput?.addEventListener("input", () => {
  lessonTopicCounter.textContent = `${lessonTopicInput.value.length} / 300`;
});

formStartLesson?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const topic = lessonTopicInput.value.trim();
  if (topic.length < 3 || topic.length > 300) {
    showToast("Dars mavzusi 3 dan 300 belgigacha bo'lishi kerak", "error");
    return;
  }

  const lessonNo = parseInt(startLessonNo.value, 10);
  const origText = btnSubmitStartLesson.textContent;
  btnSubmitStartLesson.disabled = true;
  btnSubmitStartLesson.textContent = "Saqlanmoqda...";

  try {
    await apiRequest("/api/lessons/start", {
      method: "POST",
      body: JSON.stringify({ lesson_no: lessonNo, topic })
    });

    haptic.notification("success");
    showToast("Dars mavzusi muvaffaqiyatli saqlandi", "success");
    sheetStartLesson?.classList.add("hidden");
    updateBackButton();

    await fetchStatus();
    if (currentTabId === "tabAttendance") await loadAttendance();
    if (currentTabId === "tabGrades") await loadGrades();
  } catch (err) {
  } finally {
    btnSubmitStartLesson.disabled = false;
    btnSubmitStartLesson.textContent = origText;
  }
});

// Imtihon ochish sheet
const sheetStartExam = document.getElementById("sheetStartExam");
const formStartExam = document.getElementById("formStartExam");
const examNameInput = document.getElementById("examNameInput");
const examTopicInput = document.getElementById("examTopicInput");
const examTopicCounter = document.getElementById("examTopicCounter");
const btnExamLesson1 = document.getElementById("btnExamLesson1");
const btnExamLesson2 = document.getElementById("btnExamLesson2");
const btnSubmitStartExam = document.getElementById("btnSubmitStartExam");

let selectedExamLesson = 1;

btnExamLesson1?.addEventListener("click", () => {
  haptic.selection();
  selectedExamLesson = 1;
  btnExamLesson1.classList.add("active");
  btnExamLesson2.classList.remove("active");
});

btnExamLesson2?.addEventListener("click", () => {
  haptic.selection();
  selectedExamLesson = 2;
  btnExamLesson2.classList.add("active");
  btnExamLesson1.classList.remove("active");
});

examTopicInput?.addEventListener("input", () => {
  examTopicCounter.textContent = `${examTopicInput.value.length} / 300`;
});

function openStartExamSheet() {
  const isL1Open = systemStatus.lesson1_open && !systemStatus.is_weekend;
  const isL2Open = systemStatus.lesson2_open && !systemStatus.is_weekend;

  if (!isL1Open && !isL2Open) {
    showToast("Dars oynasi yopiq, imtihon ochish taqiqlangan", "error");
    return;
  }

  selectedExamLesson = isL2Open ? 2 : 1;
  if (selectedExamLesson === 2) {
    btnExamLesson2?.classList.add("active");
    btnExamLesson1?.classList.remove("active");
  } else {
    btnExamLesson1?.classList.add("active");
    btnExamLesson2?.classList.remove("active");
  }

  examNameInput.value = "";
  examTopicInput.value = "";
  examTopicCounter.textContent = "0 / 300";

  sheetStartExam?.classList.remove("hidden");
  updateBackButton();
}

document.getElementById("cardTodayExam")?.addEventListener("click", async () => {
  haptic.impact("light");
  const exams = systemStatus.exams || [];
  if (exams.length === 0) {
    openStartExamSheet();
  } else if (exams.length === 1) {
    await switchTab("tabGrades");
    document.getElementById("btnGradeKindExam")?.click();
    selectedExam = exams[0];
    await loadExamGrades(exams[0].id);
  } else {
    await switchTab("tabGrades");
    document.getElementById("btnGradeKindExam")?.click();
    selectedExam = null;
    await loadExamsList();
  }
});

formStartExam?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const name = examNameInput.value.trim();
  const topic = examTopicInput.value.trim();

  if (name.length < 2 || name.length > 100) {
    showToast("Imtihon nomi kamida 2 belgi bo'lishi kerak", "error");
    return;
  }
  if (topic.length < 3 || topic.length > 300) {
    showToast("Imtihon mavzusi kamida 3 belgi bo'lishi kerak", "error");
    return;
  }

  const origText = btnSubmitStartExam.textContent;
  btnSubmitStartExam.disabled = true;
  btnSubmitStartExam.textContent = "Ochilmoqda...";

  try {
    const res = await apiRequest("/api/exams", {
      method: "POST",
      body: JSON.stringify({
        name,
        topic,
        lesson_no: selectedExamLesson
      })
    });

    haptic.notification("success");
    showToast("Imtihon muvaffaqiyatli ochildi", "success");
    sheetStartExam?.classList.add("hidden");
    updateBackButton();

    await fetchStatus();

    // AVTOMATIK shu imtihonning baholash ekraniga o'tish
    await switchTab("tabGrades");
    document.getElementById("btnGradeKindExam")?.click();
    selectedExam = res;
    await loadExamGrades(res.id);
  } catch (err) {
  } finally {
    btnSubmitStartExam.disabled = false;
    btnSubmitStartExam.textContent = origText;
  }
});

// ====================================================
// 2. O'QUVCHILAR BO'LIMI VA PROFIL (HARD DELETE BILAN)
// ====================================================
let allStudents = [];
let selectedStudentForProfile = null;
const studentsListEl = document.getElementById("studentsList");
const studentSearchInput = document.getElementById("studentSearchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const studentsLoaderEl = document.getElementById("studentsLoader");
const modalStudent = document.getElementById("modalStudent");
const formStudent = document.getElementById("formStudent");
const modalStudentProfile = document.getElementById("modalStudentProfile");
const sheetCollectDebt = document.getElementById("sheetCollectDebt");
const formCollectDebt = document.getElementById("formCollectDebt");

let searchDebounceTimeout = null;
let studentsSelectedClass = "all";

async function loadStudents() {
  studentsLoaderEl?.classList.remove("hidden");
  try {
    const query = studentSearchInput.value.trim();
    const endpoint = query ? `/api/students?search=${encodeURIComponent(query)}` : "/api/students";
    allStudents = await apiRequest(endpoint);
    renderStudents();
  } catch (e) {
    console.warn("O'quvchilarni yuklashda xato:", e);
  } finally {
    studentsLoaderEl?.classList.add("hidden");
  }
}

studentSearchInput?.addEventListener("input", () => {
  if (studentSearchInput.value.length > 0) {
    btnClearSearch?.classList.remove("hidden");
  } else {
    btnClearSearch?.classList.add("hidden");
  }

  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadStudents();
  }, 250);
});

btnClearSearch?.addEventListener("click", () => {
  haptic.impact("light");
  studentSearchInput.value = "";
  btnClearSearch.classList.add("hidden");
  loadStudents();
});

function renderStudents() {
  studentsListEl.replaceChildren();

  renderClassChips("studentsClassChips", allStudents, studentsSelectedClass, (cls) => {
    studentsSelectedClass = cls;
    renderStudents();
  });

  let filtered = allStudents.filter(st => {
    if (studentsSelectedClass !== "all") {
      if (!st.grade || String(st.grade).trim() !== String(studentsSelectedClass).trim()) {
        return false;
      }
    }
    return true;
  });

  filtered = sortStudentsAlphabetically(filtered);
  const duplicateNames = getDuplicateNameSet(filtered);

  if (!filtered || filtered.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card empty-card";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon-wrap";
    emptyIcon.appendChild(createSvgIcon("users", 24));

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";

    emptyCard.appendChild(emptyIcon);
    emptyCard.appendChild(emptyTitle);
    studentsListEl.appendChild(emptyCard);
    return;
  }

  filtered.forEach((st) => {
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";

    const studentFullName = formatStudentFullName(st);

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = getAvatarColor(studentFullName);
    avatar.textContent = getInitials(st.first_name, st.last_name);

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = studentFullName;
    info.appendChild(title);

    const hasDuplicate = duplicateNames.has(studentFullName.toLowerCase());
    if (st.grade && st.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${st.grade.trim()}`;
      info.appendChild(subtitle);
    } else if (hasDuplicate) {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Sinfi yo'q";
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    const chevron = document.createElement("div");
    chevron.className = "card-chevron";
    chevron.appendChild(createSvgIcon("chevron-right", 18));

    card.appendChild(cardLeft);
    card.appendChild(chevron);

    card.onclick = () => {
      haptic.impact("light");
      openStudentProfile(st);
    };

    studentsListEl.appendChild(card);
  });
}

// O'quvchi Profili Modali (6 ta metrika kartasi, amallar va davomat tarixi)
async function openStudentProfile(st) {
  selectedStudentForProfile = st;

  const profAvatar = document.getElementById("profAvatar");
  const profName = document.getElementById("profName");
  const profGrade = document.getElementById("profGrade");

  const studentFullName = `${st.first_name || ""} ${st.last_name || ""}`.trim();

  if (profAvatar) {
    profAvatar.style.background = getAvatarColor(studentFullName);
    profAvatar.textContent = getInitials(st.first_name, st.last_name);
  }
  if (profName) profName.textContent = studentFullName;
  if (profGrade) {
    if (st.grade && st.grade.trim() !== "") {
      profGrade.textContent = `Sinf: ${st.grade.trim()}`;
      profGrade.classList.remove("hidden");
    } else {
      profGrade.textContent = "";
      profGrade.classList.add("hidden");
    }
  }

  document.getElementById("profTotalAbsences").textContent = "...";
  document.getElementById("profTotalLates").textContent = "...";
  document.getElementById("profTotalScore").textContent = "...";
  document.getElementById("profDailyScore").textContent = "...";
  document.getElementById("profExamScore").textContent = "...";
  document.getElementById("profTotalDebt").textContent = "...";

  modalStudentProfile?.classList.remove("hidden");
  updateBackButton();

  await reloadProfileData(st.id);
}

async function reloadProfileData(studentId) {
  const elAbsences = document.getElementById("profTotalAbsences");
  const elLates = document.getElementById("profTotalLates");
  const elTotalScore = document.getElementById("profTotalScore");
  const elDailyScore = document.getElementById("profDailyScore");
  const elExamScore = document.getElementById("profExamScore");
  const elTotalDebt = document.getElementById("profTotalDebt");
  const elHistoryList = document.getElementById("profHistoryList");
  const elHistoryCount = document.getElementById("profHistoryCount");
  const elAttHistoryList = document.getElementById("profAttHistoryList");

  try {
    const data = await apiRequest(`/api/students/${studentId}/profile`);

    if (elAbsences) elAbsences.textContent = `${data.total_absences ?? 0} ta`;
    if (elLates) elLates.textContent = `${data.total_lates ?? 0} ta`;
    if (elTotalScore) elTotalScore.textContent = `${data.total_score ?? 0} ball`;
    if (elDailyScore) elDailyScore.textContent = `${data.daily_score ?? 0} ball`;
    if (elExamScore) elExamScore.textContent = `${data.exam_score ?? 0} ball`;
    if (elTotalDebt) elTotalDebt.textContent = `${Number(data.total_debt ?? 0).toLocaleString("uz-UZ")} so'm`;

    const history = data.history || [];
    if (elHistoryCount) elHistoryCount.textContent = `${history.length} ta amal`;

    // Amallar tarixi
    if (elHistoryList) {
      elHistoryList.replaceChildren();
      if (history.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "empty-title";
        emptyDiv.style.padding = "16px";
        emptyDiv.style.textAlign = "center";
        emptyDiv.textContent = "Amallar tarixi mavjud emas";
        elHistoryList.appendChild(emptyDiv);
      } else {
        history.forEach((item) => {
          const row = document.createElement("div");
          row.className = "history-item-row";

          const left = document.createElement("div");
          left.className = "history-item-left";

          const iconWrap = document.createElement("div");
          iconWrap.className = "history-item-icon";

          const isFine = item.type === "fine";
          iconWrap.style.background = isFine ? "rgba(228, 0, 43, 0.1)" : "rgba(16, 185, 129, 0.1)";
          iconWrap.style.color = isFine ? "#E4002B" : "#059669";
          iconWrap.appendChild(createSvgIcon(isFine ? "alert-circle" : "check-circle", 16));

          const textWrap = document.createElement("div");
          const typeTitle = document.createElement("div");
          typeTitle.className = "history-item-type";
          typeTitle.textContent = isFine ? "Jarima belgilandi" : "Qarz to'lovi qabul qilindi";

          const dateSub = document.createElement("div");
          dateSub.className = "history-item-date";
          dateSub.textContent = formatDateTime24(item.created_at);

          textWrap.appendChild(typeTitle);
          textWrap.appendChild(dateSub);

          left.appendChild(iconWrap);
          left.appendChild(textWrap);

          const amountDiv = document.createElement("div");
          amountDiv.className = `history-item-amount ${isFine ? "amount-fine" : "amount-payment"}`;
          amountDiv.textContent = `${isFine ? "+" : "-"}${Number(item.amount).toLocaleString("uz-UZ")} so'm`;

          row.appendChild(left);
          row.appendChild(amountDiv);
          elHistoryList.appendChild(row);
        });
      }
    }

    // Davomat tarixi
    if (elAttHistoryList) {
      elAttHistoryList.replaceChildren();
      const attHistory = data.attendance_history || [];
      if (attHistory.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "empty-title";
        emptyDiv.style.padding = "16px";
        emptyDiv.style.textAlign = "center";
        emptyDiv.textContent = "Davomat yozuvlari mavjud emas";
        elAttHistoryList.appendChild(emptyDiv);
      } else {
        attHistory.forEach((item) => {
          const row = document.createElement("div");
          row.className = "teacher-lesson-row";

          const dateSpan = document.createElement("span");
          dateSpan.className = "teacher-lesson-num";
          dateSpan.textContent = `${formatDisplayDate(item.date)} (${item.lesson}-dars)`;

          const statusSpan = document.createElement("span");
          statusSpan.className = "teacher-lesson-topic";
          if (item.status === "absent") {
            statusSpan.style.color = "var(--primary-red)";
            statusSpan.style.fontWeight = "700";
            statusSpan.textContent = "Kelmadi";
          } else if (item.status === "late") {
            statusSpan.style.color = "#D97706";
            statusSpan.style.fontWeight = "700";
            statusSpan.textContent = formatLateMinutes(item.late_minutes);
          } else {
            statusSpan.textContent = "Kelgan";
          }

          row.appendChild(dateSpan);
          row.appendChild(statusSpan);
          elAttHistoryList.appendChild(row);
        });
      }
    }
  } catch (err) {
    console.warn("Profil ma'lumotlarini yuklashda xato:", err);
  }
}

document.getElementById("btnCloseProfile")?.addEventListener("click", () => {
  haptic.impact("light");
  modalStudentProfile?.classList.add("hidden");
  updateBackButton();
});

// Jarima belgilash (+10 000 so'm, confirm dialog bilan)
document.getElementById("btnProfAddFine")?.addEventListener("click", async () => {
  if (!selectedStudentForProfile) return;
  const btn = document.getElementById("btnProfAddFine");
  if (btn?.disabled) return;
  haptic.impact("medium");

  const studentName = formatStudentFullName(selectedStudentForProfile);
  const confirmed = await confirmAction(
    `"${studentName}" o'quvchisiga 10 000 so'm jarima belgilashni tasdiqlaysizmi?`,
    "Jarima belgilash"
  );

  if (confirmed) {
    if (btn) btn.disabled = true;
    try {
      await apiRequest(`/api/students/${selectedStudentForProfile.id}/fine`, {
        method: "POST",
        body: JSON.stringify({ amount: 10000 })
      });
      haptic.notification("success");
      showToast("10 000 so'm jarima belgilandi", "success");
      await reloadProfileData(selectedStudentForProfile.id);
    } catch (err) {
    } finally {
      if (btn) btn.disabled = false;
    }
  }
});

// Qarz undirish
document.getElementById("btnProfCollectDebt")?.addEventListener("click", () => {
  if (!selectedStudentForProfile) return;
  haptic.impact("light");

  const subtitle = document.getElementById("sheetCollectSubtitle");
  const profDebt = document.getElementById("profTotalDebt");
  const amountInput = document.getElementById("collectAmountInput");

  if (subtitle && profDebt) {
    subtitle.textContent = `Mavjud qarz: ${profDebt.textContent}`;
  }
  if (amountInput) {
    amountInput.value = "";
  }

  sheetCollectDebt?.classList.remove("hidden");
  updateBackButton();
});

document.querySelectorAll(".sum-chip").forEach((chip) => {
  chip.onclick = () => {
    haptic.impact("light");
    const amountInput = document.getElementById("collectAmountInput");
    if (!amountInput) return;

    if (chip.id === "btnChipFullDebt") {
      const profDebt = document.getElementById("profTotalDebt");
      const num = parseInt((profDebt?.textContent || "").replace(/\D/g, ""), 10) || 0;
      amountInput.value = num > 0 ? String(num) : "";
    } else {
      amountInput.value = chip.getAttribute("data-sum");
    }
  };
});

formCollectDebt?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const amountInput = document.getElementById("collectAmountInput");
  const amount = parseInt(amountInput.value.trim(), 10);

  if (!amount || amount <= 0) {
    showToast("Noto'g'ri summa kiritildi", "error");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitCollect");
  const origText = btnSubmit.textContent;
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Undirilmoqda...";

  try {
    await apiRequest(`/api/students/${selectedStudentForProfile.id}/collect`, {
      method: "POST",
      body: JSON.stringify({ amount })
    });

    haptic.notification("success");
    showToast("Qarz to'lovi muvaffaqiyatli qabul qilindi", "success");
    sheetCollectDebt?.classList.add("hidden");
    updateBackButton();
    await reloadProfileData(selectedStudentForProfile.id);
  } catch (err) {
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = origText;
  }
});

document.getElementById("btnProfileEdit")?.addEventListener("click", () => {
  haptic.impact("light");
  if (selectedStudentForProfile) {
    openEditStudentModal(selectedStudentForProfile);
  }
});

// O'quvchini butunlay o'chirish (Hard Delete + Cascade)
document.getElementById("btnProfileDelete")?.addEventListener("click", async () => {
  if (!selectedStudentForProfile) return;
  haptic.impact("medium");

  const name = `${selectedStudentForProfile.first_name || ""} ${selectedStudentForProfile.last_name || ""}`.trim();
  const confirmed = await confirmAction(
    `"${name}" o'quvchisi botdan va barcha ma'lumotlardan butunlay o'chadi. Qaytarib bo'lmaydi.`,
    "O'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/students/${selectedStudentForProfile.id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("O'quvchi muvaffaqiyatli o'chirildi", "success");
      modalStudentProfile?.classList.add("hidden");
      updateBackButton();
      loadStudents();
      loadHomeDashboard();
    } catch (err) {}
  }
});

function openAddStudentModal() {
  document.getElementById("modalStudentTitle").textContent = "O'quvchi qo'shish";
  document.getElementById("studentId").value = "";
  document.getElementById("studentFirstName").value = "";
  document.getElementById("studentLastName").value = "";
  document.getElementById("studentGrade").value = "";
  modalStudent?.classList.remove("hidden");
  updateBackButton();
}

function openEditStudentModal(st) {
  document.getElementById("modalStudentTitle").textContent = "O'quvchini tahrirlash";
  document.getElementById("studentId").value = st.id;
  document.getElementById("studentFirstName").value = st.first_name || "";
  document.getElementById("studentLastName").value = st.last_name || "";
  document.getElementById("studentGrade").value = st.grade || "";
  modalStudent?.classList.remove("hidden");
  updateBackButton();
}

document.getElementById("btnCloseStudentModal")?.addEventListener("click", () => {
  haptic.impact("light");
  modalStudent?.classList.add("hidden");
  updateBackButton();
});

formStudent?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const saveBtn = document.getElementById("btnSaveStudent");
  const origText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saqlanmoqda...";

  const id = document.getElementById("studentId").value;
  const gradeVal = document.getElementById("studentGrade").value.trim();
  const payload = {
    first_name: document.getElementById("studentFirstName").value.trim(),
    last_name: document.getElementById("studentLastName").value.trim() || null,
    grade: gradeVal || null
  };

  try {
    if (id) {
      await apiRequest(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("O'quvchi ma'lumotlari yangilandi", "success");
      if (selectedStudentForProfile && selectedStudentForProfile.id === parseInt(id, 10)) {
        selectedStudentForProfile.first_name = payload.first_name;
        selectedStudentForProfile.last_name = payload.last_name;
        selectedStudentForProfile.grade = payload.grade;
        openStudentProfile(selectedStudentForProfile);
      }
    } else {
      await apiRequest("/api/students", { method: "POST", body: JSON.stringify(payload) });
      showToast("Yangi o'quvchi muvaffaqiyatli qo'shildi", "success");
    }

    haptic.notification("success");
    modalStudent?.classList.add("hidden");
    updateBackButton();
    loadStudents();
  } catch (err) {
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = origText;
  }
});

// ====================================================
// 3. DAVOMAT BO'LIMI: KELDI / KELMADI / KECH QOLDI
// ====================================================
let currentAttDate = getTodayString();
let currentAttLesson = 1; // 1 | 2
let currentAttCalYear = new Date().getFullYear();
let currentAttCalMonth = new Date().getMonth();
let attendanceMonthCache = {};

let attStateMap = new Map(); // student_id => { status: "present"|"absent"|"late", late_minutes: number|null }
let attStudentsList = [];
let currentAttIsStarted = false;
let currentAttTopic = "";
let attSearchQuery = "";
let attSelectedClass = "all";

const attendanceListEl = document.getElementById("attendanceList");
const attendanceLoaderEl = document.getElementById("attendanceLoader");
const attCalMonthTitleEl = document.getElementById("attCalMonthTitle");
const attCalendarGridEl = document.getElementById("attCalendarGrid");
const attSelectedDateTitleEl = document.getElementById("attSelectedDateTitle");
const attSummaryStatEl = document.getElementById("attSummaryStat");
const attLessonTopicText = document.getElementById("attLessonTopicText");
const attTopicWarningBanner = document.getElementById("attTopicWarningBanner");
const attSearchInput = document.getElementById("attSearchInput");
const btnClearAttSearch = document.getElementById("btnClearAttSearch");
let attSearchDebounce = null;

attSearchInput?.addEventListener("input", () => {
  if (attSearchInput.value.length > 0) {
    btnClearAttSearch?.classList.remove("hidden");
  } else {
    btnClearAttSearch?.classList.add("hidden");
  }
  clearTimeout(attSearchDebounce);
  attSearchDebounce = setTimeout(() => {
    attSearchQuery = attSearchInput.value.trim();
    renderAttendanceList();
  }, 250);
});

btnClearAttSearch?.addEventListener("click", () => {
  haptic.impact("light");
  attSearchInput.value = "";
  btnClearAttSearch.classList.add("hidden");
  attSearchQuery = "";
  renderAttendanceList();
});

document.getElementById("btnAttLesson1")?.addEventListener("click", async () => {
  if (currentAttLesson === 1) return;
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.selection();
  currentAttLesson = 1;
  document.getElementById("btnAttLesson1")?.classList.add("active");
  document.getElementById("btnAttLesson2")?.classList.remove("active");
  updateWindowStatusUI();
  await loadAttendance();
});

document.getElementById("btnAttLesson2")?.addEventListener("click", async () => {
  if (currentAttLesson === 2) return;
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.selection();
  currentAttLesson = 2;
  document.getElementById("btnAttLesson2")?.classList.add("active");
  document.getElementById("btnAttLesson1")?.classList.remove("active");
  updateWindowStatusUI();
  await loadAttendance();
});

function renderAttendanceCalendar() {
  if (!attCalendarGridEl) return;
  attCalendarGridEl.replaceChildren();

  if (attCalMonthTitleEl) {
    attCalMonthTitleEl.textContent = `${MONTH_NAMES_UZ[currentAttCalMonth]} ${currentAttCalYear}`;
  }

  const firstDay = new Date(currentAttCalYear, currentAttCalMonth, 1).getDay();
  const startingDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentAttCalYear, currentAttCalMonth + 1, 0).getDate();

  for (let i = 0; i < startingDay; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.className = "cal-day empty";
    attCalendarGridEl.appendChild(emptySlot);
  }

  const todayStr = getTodayString();

  for (let day = 1; day <= daysInMonth; day++) {
    const mStr = String(currentAttCalMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const fullDate = `${currentAttCalYear}-${mStr}-${dStr}`;

    const dayEl = document.createElement("div");
    dayEl.className = "cal-day";
    dayEl.textContent = String(day);

    if (fullDate === todayStr) {
      dayEl.classList.add("today");
    }
    if (fullDate === currentAttDate) {
      dayEl.classList.add("selected");
    }

    const cachedInfo = attendanceMonthCache[fullDate];
    if (cachedInfo) {
      const dot = document.createElement("span");
      dot.className = "cal-day-dot";
      if (cachedInfo.has_absent) {
        dot.classList.add("dot-red");
      } else if (cachedInfo.is_saved) {
        dot.classList.add("dot-green");
      }
      dayEl.appendChild(dot);
    }

    dayEl.onclick = async () => {
      if (fullDate === currentAttDate) return;
      const canLeave = await confirmDiscardChangesIfNeeded();
      if (!canLeave) return;
      hasUserSelectedAttDate = true;
      haptic.selection();
      currentAttDate = fullDate;
      renderAttendanceCalendar();
      await loadAttendance();
    };

    attCalendarGridEl.appendChild(dayEl);
  }
}

document.getElementById("btnAttCalPrev")?.addEventListener("click", () => {
  haptic.impact("light");
  currentAttCalMonth--;
  if (currentAttCalMonth < 0) {
    currentAttCalMonth = 11;
    currentAttCalYear--;
  }
  renderAttendanceCalendar();
});

document.getElementById("btnAttCalNext")?.addEventListener("click", () => {
  haptic.impact("light");
  currentAttCalMonth++;
  if (currentAttCalMonth > 11) {
    currentAttCalMonth = 0;
    currentAttCalYear++;
  }
  renderAttendanceCalendar();
});

async function loadAttendance() {
  attendanceLoaderEl?.classList.remove("hidden");
  if (attSelectedDateTitleEl) {
    attSelectedDateTitleEl.textContent = formatDisplayDate(currentAttDate);
  }

  try {
    const endpoint = `/api/attendance?date=${currentAttDate}&lesson=${currentAttLesson}`;
    const res = await apiRequest(endpoint);

    attStateMap.clear();

    currentAttIsStarted = Boolean(res?.is_started);
    currentAttTopic = res?.topic || "";

    if (currentAttIsStarted && currentAttTopic) {
      attLessonTopicText.textContent = currentAttTopic;
      attTopicWarningBanner.classList.add("hidden");
    } else {
      attLessonTopicText.textContent = "Mavzu kiritilmagan";
      attTopicWarningBanner.classList.remove("hidden");
    }

    if (res && res.students) {
      attStudentsList = res.students;
      res.students.forEach((st) => {
        const sId = st.student_id || st.id;
        attStateMap.set(sId, {
          status: st.status || "present",
          late_minutes: st.late_minutes || null
        });
      });
    }

    isAttDirty = false;
    renderAttendanceList();
  } catch (e) {
    console.warn("Davomatni yuklashda xato:", e);
  } finally {
    attendanceLoaderEl?.classList.add("hidden");
    updateWindowStatusUI();
    syncSaveBarForCurrentScreen();
  }
}

function renderAttendanceList() {
  attendanceListEl.replaceChildren();

  const total = attStudentsList ? attStudentsList.length : 0;
  let absentCount = 0;

  attStateMap.forEach((val) => {
    if (val.status === "absent") absentCount++;
  });

  const presentCount = Math.max(0, total - absentCount);

  if (attSummaryStatEl) {
    attSummaryStatEl.textContent = `Keldi: ${presentCount} / ${total}`;
  }

  const isToday = currentAttDate === getTodayString();
  const isWindowOpen = isLessonWindowOpen(currentAttLesson) && isToday && !systemStatus.is_weekend;
  const canEdit = isWindowOpen && currentAttIsStarted;

  renderClassChips("attClassChips", attStudentsList, attSelectedClass, (cls) => {
    attSelectedClass = cls;
    renderAttendanceList();
  });

  const filtered = attStudentsList.filter((st) => {
    return matchStudentSearchAndClass(st, attSearchQuery, attSelectedClass);
  });

  const sorted = sortStudentsAlphabetically(filtered);
  const duplicateNames = getDuplicateNameSet(sorted);

  if (!sorted || sorted.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card empty-card";
    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";
    emptyCard.appendChild(emptyTitle);
    attendanceListEl.appendChild(emptyCard);
    syncSaveBarForCurrentScreen();
    return;
  }

  sorted.forEach((st) => {
    const sId = st.student_id || st.id;
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";
    cardLeft.style.cursor = "pointer";

    const studentFullName = formatStudentFullName(st);

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = getAvatarColor(studentFullName);
    avatar.textContent = getInitials(st.first_name, st.last_name);

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = studentFullName;
    info.appendChild(title);

    const hasDuplicate = duplicateNames.has(studentFullName.toLowerCase());
    if (st.grade && st.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${st.grade.trim()}`;
      info.appendChild(subtitle);
    } else if (hasDuplicate) {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Sinfi yo'q";
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    cardLeft.onclick = () => {
      haptic.impact("light");
      openStudentProfile({
        id: sId,
        first_name: st.first_name,
        last_name: st.last_name,
        grade: st.grade
      });
    };

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "att-actions-wrap";

    const curState = attStateMap.get(sId) || { status: "present", late_minutes: null };

    // Tugma 1: Kelmadi
    const btnAbsent = document.createElement("button");
    btnAbsent.type = "button";
    btnAbsent.className = "btn-att-absent";
    btnAbsent.textContent = "Kelmadi";

    if (curState.status === "absent") {
      btnAbsent.classList.add("is-absent");
    }

    // Tugma 2: Kech qoldi
    const btnLate = document.createElement("button");
    btnLate.type = "button";
    btnLate.className = "btn-att-late";

    if (curState.status === "late" && curState.late_minutes) {
      btnLate.className = "chip-late-badge is-late";
      btnLate.textContent = formatLateMinutes(curState.late_minutes);
    } else {
      btnLate.textContent = "Kech qoldi";
    }

    if (!canEdit) {
      btnAbsent.disabled = true;
      btnAbsent.classList.add("is-disabled-window");
      btnLate.disabled = true;
      btnLate.classList.add("is-disabled-window");
    }

    btnAbsent.onclick = (e) => {
      e.stopPropagation();
      if (!canEdit) {
        showToast("Dars oynasi yopiq yoki mavzu kiritilmagan", "error");
        return;
      }
      haptic.impact("light");

      if (curState.status === "absent") {
        attStateMap.set(sId, { status: "present", late_minutes: null });
      } else {
        attStateMap.set(sId, { status: "absent", late_minutes: null });
      }
      isAttDirty = true;
      renderAttendanceList();
      syncSaveBarForCurrentScreen();
    };

    btnLate.onclick = (e) => {
      e.stopPropagation();
      if (!canEdit) {
        showToast("Dars oynasi yopiq yoki mavzu kiritilmagan", "error");
        return;
      }
      haptic.impact("light");
      openLateArrivalSheet(sId, curState);
    };

    actionsWrap.appendChild(btnAbsent);
    actionsWrap.appendChild(btnLate);

    card.appendChild(cardLeft);
    card.appendChild(actionsWrap);
    attendanceListEl.appendChild(card);
  });

  syncSaveBarForCurrentScreen();
}

// Kech qoldi Bottom Sheet
const sheetLateArrival = document.getElementById("sheetLateArrival");
const formLateArrival = document.getElementById("formLateArrival");
const lateStudentId = document.getElementById("lateStudentId");
const lateAmountInput = document.getElementById("lateAmountInput");
const btnUnitMinutes = document.getElementById("btnUnitMinutes");
const btnUnitHours = document.getElementById("btnUnitHours");
const btnLateCancel = document.getElementById("btnLateCancel");
const btnLateConfirm = document.getElementById("btnLateConfirm");
const lateInputError = document.getElementById("lateInputError");

let lateCurrentUnit = "minute"; // minute | hour

function validateLateInput() {
  const valStr = lateAmountInput ? lateAmountInput.value.trim() : "";
  const num = Number(valStr);
  const isInt = Number.isInteger(num) && /^\d+$/.test(valStr) && num > 0;
  let totalMinutes = 0;

  if (lateCurrentUnit === "hour") {
    totalMinutes = num * 60;
  } else {
    totalMinutes = num;
  }

  const isValid = isInt && totalMinutes >= 1 && totalMinutes <= 600;

  if (lateInputError) {
    if (!isValid) {
      lateInputError.classList.remove("hidden");
      if (!isInt) {
        lateInputError.textContent = "Faqat musbat butun son kiriting";
      } else {
        lateInputError.textContent = "Kech qolish vaqti 1 dan 600 daqiqagacha bo'lishi kerak";
      }
    } else {
      lateInputError.classList.add("hidden");
    }
  }

  if (btnLateConfirm) {
    btnLateConfirm.disabled = !isValid;
  }
  return isValid;
}

lateAmountInput?.addEventListener("input", () => {
  validateLateInput();
});

btnUnitMinutes?.addEventListener("click", () => {
  haptic.selection();
  lateCurrentUnit = "minute";
  btnUnitMinutes.classList.add("active");
  btnUnitHours.classList.remove("active");
  validateLateInput();
});

btnUnitHours?.addEventListener("click", () => {
  haptic.selection();
  lateCurrentUnit = "hour";
  btnUnitHours.classList.add("active");
  btnUnitMinutes.classList.remove("active");
  validateLateInput();
});

function openLateArrivalSheet(sId, curState) {
  lateStudentId.value = String(sId);

  if (curState.status === "late" && curState.late_minutes) {
    if (curState.late_minutes >= 60 && curState.late_minutes % 60 === 0) {
      lateAmountInput.value = String(curState.late_minutes / 60);
      lateCurrentUnit = "hour";
      btnUnitHours?.classList.add("active");
      btnUnitMinutes?.classList.remove("active");
    } else {
      lateAmountInput.value = String(curState.late_minutes);
      lateCurrentUnit = "minute";
      btnUnitMinutes?.classList.add("active");
      btnUnitHours?.classList.remove("active");
    }
  } else {
    lateAmountInput.value = "15";
    lateCurrentUnit = "minute";
    btnUnitMinutes?.classList.add("active");
    btnUnitHours?.classList.remove("active");
  }

  validateLateInput();
  sheetLateArrival?.classList.remove("hidden");
  updateBackButton();
}

btnLateCancel?.addEventListener("click", () => {
  haptic.impact("light");
  const sId = parseInt(lateStudentId.value, 10);
  if (sId) {
    attStateMap.set(sId, { status: "present", late_minutes: null });
    isAttDirty = true;
  }
  sheetLateArrival?.classList.add("hidden");
  updateBackButton();
  renderAttendanceList();
  syncSaveBarForCurrentScreen();
});

formLateArrival?.addEventListener("submit", (e) => {
  e.preventDefault();
  haptic.impact("medium");

  if (!validateLateInput()) return;

  const sId = parseInt(lateStudentId.value, 10);
  let amount = parseInt(lateAmountInput.value.trim(), 10);
  let totalMinutes = lateCurrentUnit === "hour" ? amount * 60 : amount;

  attStateMap.set(sId, { status: "late", late_minutes: totalMinutes });
  isAttDirty = true;
  sheetLateArrival?.classList.add("hidden");
  updateBackButton();
  renderAttendanceList();
  syncSaveBarForCurrentScreen();
});

async function executeSaveAttendance() {
  const isToday = currentAttDate === getTodayString();
  const isWindowOpen = isLessonWindowOpen(currentAttLesson) && isToday && !systemStatus.is_weekend;

  if (!isWindowOpen || !currentAttIsStarted) {
    showToast("Dars oynasi yopiq yoki mavzu kiritilmagan", "error");
    return;
  }

  haptic.impact("medium");
  const absent_ids = [];
  const late = [];

  attStateMap.forEach((val, studentId) => {
    if (val.status === "absent") {
      absent_ids.push(studentId);
    } else if (val.status === "late" && val.late_minutes) {
      late.push({
        student_id: studentId,
        minutes: val.late_minutes
      });
    }
  });

  const payload = {
    date: currentAttDate,
    lesson: currentAttLesson,
    absent_ids,
    late
  };

  try {
    await apiRequest("/api/attendance", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    isAttDirty = false;
    haptic.notification("success");
    showToast("Davomat muvaffaqiyatli saqlandi", "success");
    await loadAttendance();
  } catch (err) {
    if (err.message && (err.message.includes("yopiq") || err.message.includes("403") || err.message.includes("taqiqlangan"))) {
      await fetchStatus();
      syncSaveBarForCurrentScreen();
    }
  }
}

// ====================================================
// 4. BAHOLASH BO'LIMI: DARS BAHOSI VA IMTIHON (+, −)
// ====================================================
let currentGradeDate = getTodayString();
let currentGradeLesson = 1; // 1 | 2
let currentGradeKind = "daily"; // daily | exam
let currentGradeCalYear = new Date().getFullYear();
let currentGradeCalMonth = new Date().getMonth();

let dailyGradesMap = new Map(); // student_id => value (1-5)
let dailyStudentsList = [];
let currentGradeIsStarted = false;
let currentGradeTopic = "";

let todayExamsList = [];
let selectedExam = null;
let examGradesMap = new Map(); // student_id => { value: number|null, modifier: 'plus'|'minus'|null }

const gradesDailyContainer = document.getElementById("gradesDailyContainer");
const gradesExamContainer = document.getElementById("gradesExamContainer");
const gradesListEl = document.getElementById("gradesList");
const examsListEl = document.getElementById("examsList");
const gradesLoaderEl = document.getElementById("gradesLoader");
const gradeCalMonthTitleEl = document.getElementById("gradeCalMonthTitle");
const gradeCalendarGridEl = document.getElementById("gradeCalendarGrid");
const gradeSelectedDateTitleEl = document.getElementById("gradeSelectedDateTitle");
const gradeSummaryStatEl = document.getElementById("gradeSummaryStat");
const gradeLessonTopicText = document.getElementById("gradeLessonTopicText");
const gradeTopicWarningBanner = document.getElementById("gradeTopicWarningBanner");
const btnSaveGrades = document.getElementById("btnSaveGrades");

document.getElementById("btnGradeLesson1")?.addEventListener("click", async () => {
  if (currentGradeLesson === 1) return;
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.selection();
  currentGradeLesson = 1;
  document.getElementById("btnGradeLesson1")?.classList.add("active");
  document.getElementById("btnGradeLesson2")?.classList.remove("active");
  updateWindowStatusUI();
  await loadGrades();
});

document.getElementById("btnGradeLesson2")?.addEventListener("click", async () => {
  if (currentGradeLesson === 2) return;
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.selection();
  currentGradeLesson = 2;
  document.getElementById("btnGradeLesson2")?.classList.add("active");
  document.getElementById("btnGradeLesson1")?.classList.remove("active");
  updateWindowStatusUI();
  await loadGrades();
});

document.getElementById("btnGradeKindDaily")?.addEventListener("click", async () => {
  if (currentGradeKind === "daily") return;
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.selection();
  currentGradeKind = "daily";
  document.getElementById("btnGradeKindDaily")?.classList.add("active");
  document.getElementById("btnGradeKindExam")?.classList.remove("active");
  gradesDailyContainer?.classList.remove("hidden");
  gradesExamContainer?.classList.add("hidden");
  fabAddExam?.classList.add("hidden");
  await loadGrades();
  syncSaveBarForCurrentScreen();
});

document.getElementById("btnGradeKindExam")?.addEventListener("click", async () => {
  if (currentGradeKind === "exam") return;
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.selection();
  currentGradeKind = "exam";
  document.getElementById("btnGradeKindExam")?.classList.add("active");
  document.getElementById("btnGradeKindDaily")?.classList.remove("active");
  gradesDailyContainer?.classList.add("hidden");
  gradesExamContainer?.classList.remove("hidden");
  selectedExam = null;
  fabAddExam?.classList.remove("hidden");
  await loadExamsList();
  syncSaveBarForCurrentScreen();
});

const WEEKDAYS_5 = ["Du", "Se", "Chor", "Pay", "Ju"];

function getMondayOfDate(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDateToISO(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderGradesWeekStrip() {
  const container = document.getElementById("gradeWeekStripDays");
  if (!container) return;
  container.replaceChildren();

  const [y, m, d] = currentGradeDate.split("-").map(Number);
  const curr = new Date(y, m - 1, d);
  const monday = getMondayOfDate(curr);

  const monthTitleEl = document.getElementById("gradeCalMonthTitle");
  if (monthTitleEl) {
    const monthIdx = monday.getMonth();
    const yearNum = monday.getFullYear();
    monthTitleEl.textContent = `${MONTH_NAMES_UZ[monthIdx]} ${yearNum}`;
  }

  for (let i = 0; i < 5; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const fullDate = formatDateToISO(dayDate);

    const dayEl = document.createElement("div");
    dayEl.className = "week-strip-day";
    if (fullDate === currentGradeDate) {
      dayEl.classList.add("active");
    }

    const nameEl = document.createElement("div");
    nameEl.className = "day-name";
    nameEl.textContent = WEEKDAYS_5[i];

    const numEl = document.createElement("div");
    numEl.className = "day-num";
    numEl.textContent = String(dayDate.getDate());

    dayEl.appendChild(nameEl);
    dayEl.appendChild(numEl);

    dayEl.onclick = async () => {
      if (fullDate === currentGradeDate) return;
      const canLeave = await confirmDiscardChangesIfNeeded();
      if (!canLeave) return;
      haptic.selection();
      currentGradeDate = fullDate;
      renderGradesWeekStrip();
      if (currentGradeKind === "daily") {
        await loadGrades();
      } else {
        selectedExam = null;
        await loadExamsList();
      }
    };

    container.appendChild(dayEl);
  }
}

function renderSheetMonthCalendar() {
  const gridEl = document.getElementById("gradeCalendarGrid");
  if (!gridEl) return;
  gridEl.replaceChildren();

  const titleEl = document.getElementById("sheetCalMonthTitle");
  if (titleEl) {
    titleEl.textContent = `${MONTH_NAMES_UZ[currentGradeCalMonth]} ${currentGradeCalYear}`;
  }

  const firstDay = new Date(currentGradeCalYear, currentGradeCalMonth, 1).getDay();
  const startingDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentGradeCalYear, currentGradeCalMonth + 1, 0).getDate();

  for (let i = 0; i < startingDay; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.className = "cal-day empty";
    gridEl.appendChild(emptySlot);
  }

  const todayStr = getTodayString();

  for (let day = 1; day <= daysInMonth; day++) {
    const mStr = String(currentGradeCalMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const fullDate = `${currentGradeCalYear}-${mStr}-${dStr}`;

    const dateObj = new Date(currentGradeCalYear, currentGradeCalMonth, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

    const dayEl = document.createElement("div");
    dayEl.className = "cal-day";
    dayEl.textContent = String(day);

    if (isWeekendDay) {
      dayEl.classList.add("disabled");
      dayEl.style.opacity = "0.35";
      dayEl.style.cursor = "not-allowed";
    } else {
      if (fullDate === todayStr) {
        dayEl.classList.add("today");
      }
      if (fullDate === currentGradeDate) {
        dayEl.classList.add("selected");
      }

      dayEl.onclick = async () => {
        const canLeave = await confirmDiscardChangesIfNeeded();
        if (!canLeave) return;
        haptic.selection();
        currentGradeDate = fullDate;
        closeSheetMonthCalendar();
        renderGradesWeekStrip();
        if (currentGradeKind === "daily") {
          await loadGrades();
        } else {
          selectedExam = null;
          await loadExamsList();
        }
      };
    }

    gridEl.appendChild(dayEl);
  }
}

function openSheetMonthCalendar() {
  const [y, m] = currentGradeDate.split("-").map(Number);
  currentGradeCalYear = y;
  currentGradeCalMonth = m - 1;
  renderSheetMonthCalendar();
  document.getElementById("sheetMonthCalendar")?.classList.remove("hidden");
  updateBackButton();
}

function closeSheetMonthCalendar() {
  document.getElementById("sheetMonthCalendar")?.classList.add("hidden");
  updateBackButton();
}

document.getElementById("btnGradeWeekPrev")?.addEventListener("click", async () => {
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.impact("light");
  const [y, m, d] = currentGradeDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 7);
  currentGradeDate = formatDateToISO(dt);
  renderGradesWeekStrip();
  if (currentGradeKind === "daily") {
    await loadGrades();
  } else {
    selectedExam = null;
    await loadExamsList();
  }
});

document.getElementById("btnGradeWeekNext")?.addEventListener("click", async () => {
  const canLeave = await confirmDiscardChangesIfNeeded();
  if (!canLeave) return;
  haptic.impact("light");
  const [y, m, d] = currentGradeDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 7);
  currentGradeDate = formatDateToISO(dt);
  renderGradesWeekStrip();
  if (currentGradeKind === "daily") {
    await loadGrades();
  } else {
    selectedExam = null;
    await loadExamsList();
  }
});

document.getElementById("btnOpenMonthPicker")?.addEventListener("click", () => {
  haptic.impact("light");
  openSheetMonthCalendar();
});

document.getElementById("btnSheetCalPrev")?.addEventListener("click", () => {
  haptic.impact("light");
  currentGradeCalMonth--;
  if (currentGradeCalMonth < 0) {
    currentGradeCalMonth = 11;
    currentGradeCalYear--;
  }
  renderSheetMonthCalendar();
});

document.getElementById("btnSheetCalNext")?.addEventListener("click", () => {
  haptic.impact("light");
  currentGradeCalMonth++;
  if (currentGradeCalMonth > 11) {
    currentGradeCalMonth = 0;
    currentGradeCalYear++;
  }
  renderSheetMonthCalendar();
});

// Backward-compatible alias
const renderGradesCalendar = renderGradesWeekStrip;

// Dars baholarini yuklash
let dailyGradeSearchQuery = "";
let dailyGradeSelectedClass = "all";
const dailyGradeSearchInput = document.getElementById("dailyGradeSearchInput");
const btnClearDailyGradeSearch = document.getElementById("btnClearDailyGradeSearch");
let dailyGradeSearchDebounce = null;

dailyGradeSearchInput?.addEventListener("input", () => {
  if (dailyGradeSearchInput.value.length > 0) {
    btnClearDailyGradeSearch?.classList.remove("hidden");
  } else {
    btnClearDailyGradeSearch?.classList.add("hidden");
  }
  clearTimeout(dailyGradeSearchDebounce);
  dailyGradeSearchDebounce = setTimeout(() => {
    dailyGradeSearchQuery = dailyGradeSearchInput.value.trim();
    renderDailyGradesList();
  }, 250);
});

btnClearDailyGradeSearch?.addEventListener("click", () => {
  haptic.impact("light");
  dailyGradeSearchInput.value = "";
  btnClearDailyGradeSearch.classList.add("hidden");
  dailyGradeSearchQuery = "";
  renderDailyGradesList();
});

async function loadGrades() {
  gradesLoaderEl?.classList.remove("hidden");
  if (gradeSelectedDateTitleEl) {
    gradeSelectedDateTitleEl.textContent = formatDisplayDate(currentGradeDate);
  }

  try {
    const endpoint = `/api/grades?date=${currentGradeDate}&lesson=${currentGradeLesson}&kind=daily`;
    const res = await apiRequest(endpoint);

    try {
      const lessonRes = await apiRequest(`/api/lessons?date=${currentGradeDate}&lesson=${currentGradeLesson}`);
      if (lessonRes && lessonRes.topic) {
        currentGradeIsStarted = true;
        currentGradeTopic = lessonRes.topic;
      } else {
        currentGradeIsStarted = false;
        currentGradeTopic = "";
      }
    } catch (_) {
      currentGradeIsStarted = false;
      currentGradeTopic = "";
    }

    if (currentGradeIsStarted && currentGradeTopic) {
      gradeLessonTopicText.textContent = currentGradeTopic;
      gradeTopicWarningBanner.classList.add("hidden");
    } else {
      gradeLessonTopicText.textContent = "Mavzu kiritilmagan";
      gradeTopicWarningBanner.classList.remove("hidden");
    }

    const rawItems = Array.isArray(res) ? res : (res?.items || []);
    dailyStudentsList = rawItems.map((st) => ({
      student_id: st.student_id,
      first_name: st.first_name,
      last_name: st.last_name || "",
      grade: st.grade || "",
      student_name: formatStudentFullName(st),
      status: st.status || "absent",
      value: st.value || null,
      late_minutes: st.late_minutes || null,
      late_formatted: st.late_formatted || (st.late_minutes ? formatLateMinutes(st.late_minutes) : ""),
      is_manual_present: st.status === "present" && !st.value
    }));

    isGradeDailyDirty = false;
    renderDailyGradesList();
  } catch (e) {
    console.warn("Baholarni yuklashda xato:", e);
  } finally {
    gradesLoaderEl?.classList.add("hidden");
    updateWindowStatusUI();
    syncSaveBarForCurrentScreen();
  }
}

function renderDailyGradesList() {
  gradesListEl.replaceChildren();

  const total = dailyStudentsList ? dailyStudentsList.length : 0;
  const presentCount = dailyStudentsList
    ? dailyStudentsList.filter((s) => s.status === "present" || s.status === "late").length
    : 0;

  if (gradeSummaryStatEl) {
    gradeSummaryStatEl.textContent = `Keldi: ${presentCount} / ${total}`;
  }

  const isToday = currentGradeDate === getTodayString();
  const isWindowOpen = isLessonWindowOpen(currentGradeLesson) && isToday && !systemStatus.is_weekend;
  const canEdit = isWindowOpen && currentGradeIsStarted;

  renderClassChips("dailyGradeClassChips", dailyStudentsList, dailyGradeSelectedClass, (cls) => {
    dailyGradeSelectedClass = cls;
    renderDailyGradesList();
  });

  const filtered = dailyStudentsList.filter((st) => {
    return matchStudentSearchAndClass(st, dailyGradeSearchQuery, dailyGradeSelectedClass);
  });

  const sorted = sortStudentsAlphabetically(filtered);
  const duplicateNames = getDuplicateNameSet(sorted);

  if (!sorted || sorted.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card empty-card";
    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";
    emptyCard.appendChild(emptyTitle);
    gradesListEl.appendChild(emptyCard);
    syncSaveBarForCurrentScreen();
    return;
  }

  sorted.forEach((st) => {
    const sId = st.student_id;
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";
    cardLeft.style.cursor = "pointer";

    const studentFullName = st.student_name;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = getAvatarColor(studentFullName);
    avatar.textContent = getInitials(st.first_name, st.last_name);

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = studentFullName;
    info.appendChild(title);

    const hasDuplicate = duplicateNames.has(studentFullName.toLowerCase());
    if (st.grade && st.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${st.grade.trim()}`;
      info.appendChild(subtitle);
    } else if (hasDuplicate) {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Sinfi yo'q";
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    cardLeft.onclick = (e) => {
      e.stopPropagation();
      haptic.impact("light");
      openStudentProfile({
        id: sId,
        first_name: st.first_name,
        last_name: st.last_name,
        grade: st.grade
      });
    };

    // Right side: status chip and grade chip
    const chipsWrap = document.createElement("div");
    chipsWrap.className = "row-chips-wrap";
    chipsWrap.style.display = "flex";
    chipsWrap.style.alignItems = "center";
    chipsWrap.style.gap = "8px";

    const statusChip = document.createElement("span");
    statusChip.className = `student-status-chip ${st.status}`;
    if (st.status === "present") {
      statusChip.textContent = "Keldi";
    } else if (st.status === "late") {
      statusChip.textContent = st.late_formatted || formatLateMinutes(st.late_minutes) || "Kech qoldi";
    } else {
      statusChip.textContent = "Kelmadi";
    }

    const gradeChip = document.createElement("span");
    gradeChip.className = `chip-grade-badge ${st.value ? "" : "empty"}`;
    gradeChip.textContent = st.value ? String(st.value) : "-";

    chipsWrap.appendChild(statusChip);
    chipsWrap.appendChild(gradeChip);

    card.appendChild(cardLeft);
    card.appendChild(chipsWrap);

    card.onclick = () => {
      if (!canEdit) {
        showToast("Dars oynasi yopiq yoki dars boshlanmagan", "error");
        return;
      }
      haptic.impact("light");
      openDailyGradePickerSheet(st);
    };

    gradesListEl.appendChild(card);
  });

  syncSaveBarForCurrentScreen();
}

// Kundalik baho va davomat sheet
const sheetDailyGradePicker = document.getElementById("sheetDailyGradePicker");
const sheetDailyGradeStudentName = document.getElementById("sheetDailyGradeStudentName");
const btnClearDailyGrade = document.getElementById("btnClearDailyGrade");
let editingDailyStudent = null;
let draftStatus = "absent";
let draftValue = null;
let draftLateMinutes = 15;
let draftIsManualPresent = false;
let draftLateUnit = "minute";

function openDailyGradePickerSheet(st) {
  editingDailyStudent = st;
  draftStatus = st.status || "absent";
  draftValue = st.value || null;
  draftLateMinutes = st.late_minutes || 15;
  draftIsManualPresent = Boolean(st.is_manual_present);
  draftLateUnit = "minute";

  if (sheetDailyGradeStudentName) {
    sheetDailyGradeStudentName.textContent = st.student_name;
  }

  updateDailySheetUI();
  sheetDailyGradePicker?.classList.remove("hidden");
  updateBackButton();
}

function updateDailySheetUI() {
  const btnPres = document.getElementById("btnDailyStatusPresent");
  const btnAbs = document.getElementById("btnDailyStatusAbsent");
  const btnLate = document.getElementById("btnDailyStatusLate");

  btnPres?.classList.toggle("active", draftStatus === "present");
  btnAbs?.classList.toggle("active", draftStatus === "absent");
  btnLate?.classList.toggle("active", draftStatus === "late");

  const lateSec = document.getElementById("dailyLateInputSection");
  const lateInput = document.getElementById("dailyLateAmountInput");
  const lateErr = document.getElementById("dailyLateInputError");
  if (lateErr) lateErr.classList.add("hidden");

  if (draftStatus === "late") {
    lateSec?.classList.remove("hidden");
    if (lateInput) {
      if (draftLateUnit === "hour") {
        lateInput.value = String(Math.max(1, Math.round(draftLateMinutes / 60)));
      } else {
        lateInput.value = String(draftLateMinutes || 15);
      }
    }
  } else {
    lateSec?.classList.add("hidden");
  }

  const btnMin = document.getElementById("btnDailyUnitMinutes");
  const btnHour = document.getElementById("btnDailyUnitHours");
  btnMin?.classList.toggle("active", draftLateUnit === "minute");
  btnHour?.classList.toggle("active", draftLateUnit === "hour");

  document.querySelectorAll(".grade-circle-btn[data-val]").forEach((btn) => {
    const val = parseInt(btn.getAttribute("data-val"), 10);
    btn.classList.toggle("active", draftValue === val);
  });

  if (btnClearDailyGrade) {
    if (draftValue !== null && draftValue !== undefined) {
      btnClearDailyGrade.classList.remove("hidden");
    } else {
      btnClearDailyGrade.classList.add("hidden");
    }
  }
}

document.getElementById("btnDailyStatusPresent")?.addEventListener("click", () => {
  haptic.selection();
  draftStatus = "present";
  draftIsManualPresent = true;
  updateDailySheetUI();
});

document.getElementById("btnDailyStatusAbsent")?.addEventListener("click", () => {
  haptic.selection();
  draftStatus = "absent";
  draftIsManualPresent = false;
  draftValue = null;
  draftLateMinutes = null;
  updateDailySheetUI();
});

document.getElementById("btnDailyStatusLate")?.addEventListener("click", () => {
  haptic.selection();
  draftStatus = "late";
  draftIsManualPresent = false;
  if (!draftLateMinutes) draftLateMinutes = 15;
  updateDailySheetUI();
});

document.getElementById("btnDailyUnitMinutes")?.addEventListener("click", () => {
  haptic.selection();
  draftLateUnit = "minute";
  updateDailySheetUI();
});

document.getElementById("btnDailyUnitHours")?.addEventListener("click", () => {
  haptic.selection();
  draftLateUnit = "hour";
  updateDailySheetUI();
});

document.querySelectorAll(".grade-circle-btn[data-val]").forEach((btn) => {
  btn.onclick = () => {
    haptic.selection();
    const val = parseInt(btn.getAttribute("data-val"), 10);
    if (draftStatus === "absent") {
      draftStatus = "present";
      draftIsManualPresent = false;
    }
    draftValue = val;
    updateDailySheetUI();
  };
});

btnClearDailyGrade?.addEventListener("click", () => {
  haptic.impact("light");
  draftValue = null;
  if (draftStatus === "present" && !draftIsManualPresent) {
    draftStatus = "absent";
  }
  updateDailySheetUI();
});

document.getElementById("btnSaveDailyStudent")?.addEventListener("click", () => {
  if (draftStatus === "late") {
    const input = document.getElementById("dailyLateAmountInput");
    const raw = parseInt(input?.value || "0", 10);
    const mins = draftLateUnit === "hour" ? raw * 60 : raw;
    const err = document.getElementById("dailyLateInputError");
    if (isNaN(mins) || mins < 1 || mins > 600) {
      if (err) err.classList.remove("hidden");
      return;
    }
    if (err) err.classList.add("hidden");
    draftLateMinutes = mins;
  }

  if (editingDailyStudent) {
    editingDailyStudent.status = draftStatus;
    editingDailyStudent.value = draftValue;
    editingDailyStudent.late_minutes = draftStatus === "late" ? draftLateMinutes : null;
    editingDailyStudent.late_formatted = draftStatus === "late" ? formatLateMinutes(draftLateMinutes) : null;
    editingDailyStudent.is_manual_present = draftIsManualPresent;

    isGradeDailyDirty = true;
    renderDailyGradesList();
    syncSaveBarForCurrentScreen();
  }

  sheetDailyGradePicker?.classList.add("hidden");
  updateBackButton();
});

async function executeSaveDailyGrades() {
  const isToday = currentGradeDate === getTodayString();
  const isWindowOpen = isLessonWindowOpen(currentGradeLesson) && isToday && !systemStatus.is_weekend;

  if (!isWindowOpen || !currentGradeIsStarted) {
    showToast("Dars oynasi yopiq yoki mavzu kiritilmagan", "error");
    return;
  }

  haptic.impact("medium");
  const items = dailyStudentsList.map((st) => ({
    student_id: st.student_id,
    status: st.status || "absent",
    value: st.value || null,
    late_minutes: st.status === "late" ? (st.late_minutes || 15) : null
  }));

  try {
    await apiRequest("/api/grades", {
      method: "PUT",
      body: JSON.stringify({
        date: currentGradeDate,
        lesson: currentGradeLesson,
        kind: "daily",
        items
      })
    });

    isGradeDailyDirty = false;
    haptic.notification("success");
    showToast("Dars baholari muvaffaqiyatli saqlandi", "success");
    await loadGrades();
    loadHomeDashboard();
  } catch (err) {
    if (err.message && (err.message.includes("yopiq") || err.message.includes("403") || err.message.includes("taqiqlangan"))) {
      await fetchStatus();
      syncSaveBarForCurrentScreen();
    }
  }
}

// Imtihonlar ro'yxati va imtihon baholash
let examGradeSearchQuery = "";
let examGradeSelectedClass = "all";
const examGradeSearchInput = document.getElementById("examGradeSearchInput");
const btnClearExamGradeSearch = document.getElementById("btnClearExamGradeSearch");
let examGradeSearchDebounce = null;

examGradeSearchInput?.addEventListener("input", () => {
  if (examGradeSearchInput.value.length > 0) {
    btnClearExamGradeSearch?.classList.remove("hidden");
  } else {
    btnClearExamGradeSearch?.classList.add("hidden");
  }
  clearTimeout(examGradeSearchDebounce);
  examGradeSearchDebounce = setTimeout(() => {
    examGradeSearchQuery = examGradeSearchInput.value.trim();
    renderSelectedExamGrades();
  }, 250);
});

btnClearExamGradeSearch?.addEventListener("click", () => {
  haptic.impact("light");
  examGradeSearchInput.value = "";
  btnClearExamGradeSearch.classList.add("hidden");
  examGradeSearchQuery = "";
  renderSelectedExamGrades();
});

async function loadExamsList() {
  gradesLoaderEl?.classList.remove("hidden");
  if (gradeSelectedDateTitleEl) {
    gradeSelectedDateTitleEl.textContent = formatDisplayDate(currentGradeDate);
  }

  try {
    const exams = await apiRequest(`/api/exams?date=${currentGradeDate}`);
    todayExamsList = exams || [];
    renderExamsUI();
  } catch (e) {
    console.warn("Imtihonlarni yuklashda xato:", e);
  } finally {
    gradesLoaderEl?.classList.add("hidden");
    updateWindowStatusUI();
    syncSaveBarForCurrentScreen();
  }
}

function renderExamsUI() {
  const examsListEl = document.getElementById("examsList");
  const selectedExamContainer = document.getElementById("selectedExamContainer");

  if (!selectedExam) {
    examsListEl?.classList.remove("hidden");
    selectedExamContainer?.classList.add("hidden");
    fabAddExam?.classList.remove("hidden");
    examsListEl.replaceChildren();

    if (gradeSummaryStatEl) {
      gradeSummaryStatEl.textContent = `Imtihonlar: ${todayExamsList.length} ta`;
    }

    if (todayExamsList.length === 0) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "card empty-card";
      const emptyTitle = document.createElement("div");
      emptyTitle.className = "empty-title";
      emptyTitle.textContent = "Ushbu kunda imtihon ochilmagan";
      emptyCard.appendChild(emptyTitle);
      examsListEl.appendChild(emptyCard);
      syncSaveBarForCurrentScreen();
      return;
    }

    todayExamsList.forEach((exam) => {
      const card = document.createElement("div");
      card.className = "card teacher-exam-card";

      const topRow = document.createElement("div");
      topRow.className = "lesson-card-top";

      const title = document.createElement("div");
      title.className = "teacher-exam-title";
      title.textContent = exam.name;

      const badge = document.createElement("span");
      badge.className = "lesson-card-badge";
      badge.textContent = `${exam.lesson_no}-dars`;

      topRow.appendChild(title);
      topRow.appendChild(badge);

      const sub = document.createElement("div");
      sub.className = "teacher-exam-sub";
      sub.textContent = exam.topic;

      card.appendChild(topRow);
      card.appendChild(sub);

      card.onclick = async () => {
        haptic.impact("light");
        selectedExam = exam;
        await loadExamGrades(exam.id);
      };

      examsListEl.appendChild(card);
    });
    syncSaveBarForCurrentScreen();
  } else {
    examsListEl?.classList.add("hidden");
    selectedExamContainer?.classList.remove("hidden");
    fabAddExam?.classList.add("hidden");
    renderSelectedExamGrades();
  }
}

async function loadExamGrades(examId) {
  gradesLoaderEl?.classList.remove("hidden");
  try {
    const grades = await apiRequest(`/api/exams/${examId}/grades`);
    examGradesMap.clear();

    if (grades && Array.isArray(grades)) {
      grades.forEach((g) => {
        examGradesMap.set(g.student_id, {
          student_id: g.student_id,
          name: g.student_name,
          first_name: g.first_name || "",
          last_name: g.last_name || "",
          grade: g.grade,
          value: g.value,
          modifier: g.modifier
        });
      });
    }

    isGradeExamDirty = false;
    renderExamsUI();
  } catch (err) {
  } finally {
    gradesLoaderEl?.classList.add("hidden");
    syncSaveBarForCurrentScreen();
  }
}

function renderSelectedExamGrades() {
  const selectedExamContainer = document.getElementById("selectedExamContainer");
  const selectedExamHeader = document.getElementById("selectedExamHeader");
  const selectedExamGradesList = document.getElementById("selectedExamGradesList");

  if (!selectedExam || !selectedExamContainer || !selectedExamHeader || !selectedExamGradesList) return;

  selectedExamHeader.replaceChildren();
  selectedExamGradesList.replaceChildren();

  const topRow = document.createElement("div");
  topRow.className = "lesson-card-top";

  const title = document.createElement("div");
  title.className = "teacher-exam-title";
  title.textContent = selectedExam.name;

  const btnBack = document.createElement("button");
  btnBack.className = "btn btn-secondary";
  btnBack.style.padding = "4px 10px";
  btnBack.style.fontSize = "12px";
  btnBack.textContent = "Orqaga";
  btnBack.onclick = async () => {
    const canLeave = await confirmDiscardChangesIfNeeded();
    if (!canLeave) return;
    haptic.impact("light");
    selectedExam = null;
    loadExamsList();
    updateBackButton();
    syncSaveBarForCurrentScreen();
  };

  topRow.appendChild(title);
  topRow.appendChild(btnBack);

  const sub = document.createElement("div");
  sub.className = "teacher-exam-sub";
  sub.textContent = `${selectedExam.lesson_no}-dars | ${selectedExam.topic}`;

  selectedExamHeader.appendChild(topRow);
  selectedExamHeader.appendChild(sub);

  const isToday = currentGradeDate === getTodayString();
  const isWindowOpen = isLessonWindowOpen(selectedExam.lesson_no) && isToday && !systemStatus.is_weekend;

  let gradedCount = 0;
  examGradesMap.forEach((g) => {
    if (g.value) gradedCount++;
  });

  if (gradeSummaryStatEl) {
    gradeSummaryStatEl.textContent = `Baholangan: ${gradedCount} / ${examGradesMap.size}`;
  }

  const allExamStudents = Array.from(examGradesMap.values());

  renderClassChips("examGradeClassChips", allExamStudents, examGradeSelectedClass, (cls) => {
    examGradeSelectedClass = cls;
    renderSelectedExamGrades();
  });

  const filtered = allExamStudents.filter((st) => {
    return matchStudentSearchAndClass(st, examGradeSearchQuery, examGradeSelectedClass);
  });

  const sorted = sortStudentsAlphabetically(filtered);
  const duplicateNames = getDuplicateNameSet(sorted);

  if (!sorted || sorted.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card empty-card";
    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";
    emptyCard.appendChild(emptyTitle);
    selectedExamGradesList.appendChild(emptyCard);
    syncSaveBarForCurrentScreen();
    return;
  }

  sorted.forEach((gradeData) => {
    const studentId = gradeData.student_id;
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";
    cardLeft.style.cursor = "pointer";

    const studentFullName = formatStudentFullName(gradeData);

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = getAvatarColor(studentFullName);
    avatar.textContent = getInitials(gradeData.first_name, gradeData.last_name);

    const info = document.createElement("div");
    info.className = "card-info";

    const titleDiv = document.createElement("div");
    titleDiv.className = "card-title";
    titleDiv.textContent = studentFullName;
    info.appendChild(titleDiv);

    const hasDuplicate = duplicateNames.has(studentFullName.toLowerCase());
    if (gradeData.grade && String(gradeData.grade).trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${String(gradeData.grade).trim()}`;
      info.appendChild(subtitle);
    } else if (hasDuplicate) {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Sinfi yo'q";
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    cardLeft.onclick = () => {
      haptic.impact("light");
      openStudentProfile({ id: studentId, first_name: gradeData.first_name, last_name: gradeData.last_name, grade: gradeData.grade });
    };

    const chip = document.createElement("div");
    chip.className = `chip-grade-badge ${gradeData.value ? "" : "empty"}`;

    if (gradeData.value) {
      const modStr = gradeData.modifier === "plus" ? "+" : (gradeData.modifier === "minus" ? "−" : "");
      chip.textContent = `${gradeData.value}${modStr}`;
      const subLabel = document.createElement("span");
      subLabel.className = "chip-grade-sub";
      subLabel.textContent = "Imtihon";
      chip.appendChild(subLabel);
    } else {
      chip.textContent = "-";
    }

    chip.onclick = () => {
      if (!isWindowOpen) {
        showToast("Dars oynasi yopiq, baholash taqiqlangan", "error");
        return;
      }
      haptic.impact("light");
      openExamGradePickerSheet(studentId, studentFullName, gradeData.value, gradeData.modifier);
    };

    card.appendChild(cardLeft);
    card.appendChild(chip);
    selectedExamGradesList.appendChild(card);
  });

  syncSaveBarForCurrentScreen();
}

async function executeSaveExamGrades() {
  const isToday = currentGradeDate === getTodayString();
  const isWindowOpen = isLessonWindowOpen(selectedExam?.lesson_no) && isToday && !systemStatus.is_weekend;

  if (!isWindowOpen || !selectedExam) {
    showToast("Dars oynasi yopiq, saqlash taqiqlangan", "error");
    return;
  }

  haptic.impact("medium");
  const items = [];
  examGradesMap.forEach((g, studentId) => {
    if (g.value) {
      items.push({
        student_id: studentId,
        value: g.value,
        modifier: g.modifier || null
      });
    }
  });

  try {
    await apiRequest(`/api/exams/${selectedExam.id}/grades`, {
      method: "PUT",
      body: JSON.stringify({ items })
    });

    isGradeExamDirty = false;
    haptic.notification("success");
    showToast("Imtihon baholari muvaffaqiyatli saqlandi", "success");
    await loadExamGrades(selectedExam.id);
  } catch (err) {
    if (err.message && (err.message.includes("yopiq") || err.message.includes("403") || err.message.includes("taqiqlangan"))) {
      await fetchStatus();
      syncSaveBarForCurrentScreen();
    }
  }
}

// Imtihon bahosi va modifikator sheet
const sheetExamGradePicker = document.getElementById("sheetExamGradePicker");
const sheetExamGradeStudentName = document.getElementById("sheetExamGradeStudentName");
const btnModMinus = document.getElementById("btnModMinus");
const btnModNone = document.getElementById("btnModNone");
const btnModPlus = document.getElementById("btnModPlus");
const btnClearExamGrade = document.getElementById("btnClearExamGrade");

let examPickerStudentId = null;
let examPickerSelectedVal = null;
let examPickerSelectedMod = null;

function openExamGradePickerSheet(studentId, studentName, curVal, curMod) {
  examPickerStudentId = studentId;
  examPickerSelectedVal = curVal || null;
  examPickerSelectedMod = curMod || null;

  sheetExamGradeStudentName.textContent = studentName;
  updateExamPickerButtons();

  sheetExamGradePicker?.classList.remove("hidden");
  updateBackButton();
}

function updateExamPickerButtons() {
  // 1-5 baho tugmalari
  document.querySelectorAll(".grade-circle-btn[data-exam-val]").forEach((btn) => {
    const val = parseInt(btn.getAttribute("data-exam-val"), 10);
    if (val === examPickerSelectedVal) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Modifikator tugmalari: baho yo'q bo'lsa disabled!
  const hasVal = examPickerSelectedVal !== null;
  btnModMinus.disabled = !hasVal;
  btnModNone.disabled = !hasVal;
  btnModPlus.disabled = !hasVal;

  btnModMinus.classList.remove("active");
  btnModNone.classList.remove("active");
  btnModPlus.classList.remove("active");

  if (hasVal) {
    if (examPickerSelectedMod === "minus") btnModMinus.classList.add("active");
    else if (examPickerSelectedMod === "plus") btnModPlus.classList.add("active");
    else btnModNone.classList.add("active");
  }
}

document.querySelectorAll(".grade-circle-btn[data-exam-val]").forEach((btn) => {
  btn.onclick = () => {
    haptic.selection();
    const val = parseInt(btn.getAttribute("data-exam-val"), 10);
    examPickerSelectedVal = val;
    updateExamPickerButtons();

    // Baho o'zgarganda xotirani yangilash
    if (examPickerStudentId && selectedExam) {
      const cur = examGradesMap.get(examPickerStudentId) || {};
      examGradesMap.set(examPickerStudentId, {
        ...cur,
        value: examPickerSelectedVal,
        modifier: examPickerSelectedMod
      });
      isGradeExamDirty = true;
      renderSelectedExamGrades();
      syncSaveBarForCurrentScreen();
    }
  };
});

btnModMinus?.addEventListener("click", () => {
  if (!examPickerSelectedVal) return;
  haptic.selection();
  examPickerSelectedMod = "minus";
  updateExamPickerButtons();
  if (examPickerStudentId && selectedExam) {
    const cur = examGradesMap.get(examPickerStudentId) || {};
    examGradesMap.set(examPickerStudentId, {
      ...cur,
      value: examPickerSelectedVal,
      modifier: examPickerSelectedMod
    });
    isGradeExamDirty = true;
    renderSelectedExamGrades();
    syncSaveBarForCurrentScreen();
  }
});

btnModNone?.addEventListener("click", () => {
  if (!examPickerSelectedVal) return;
  haptic.selection();
  examPickerSelectedMod = null;
  updateExamPickerButtons();
  if (examPickerStudentId && selectedExam) {
    const cur = examGradesMap.get(examPickerStudentId) || {};
    examGradesMap.set(examPickerStudentId, {
      ...cur,
      value: examPickerSelectedVal,
      modifier: null
    });
    isGradeExamDirty = true;
    renderSelectedExamGrades();
    syncSaveBarForCurrentScreen();
  }
});

btnModPlus?.addEventListener("click", () => {
  if (!examPickerSelectedVal) return;
  haptic.selection();
  examPickerSelectedMod = "plus";
  updateExamPickerButtons();
  if (examPickerStudentId && selectedExam) {
    const cur = examGradesMap.get(examPickerStudentId) || {};
    examGradesMap.set(examPickerStudentId, {
      ...cur,
      value: examPickerSelectedVal,
      modifier: examPickerSelectedMod
    });
    isGradeExamDirty = true;
    renderSelectedExamGrades();
    syncSaveBarForCurrentScreen();
  }
});

btnClearExamGrade?.addEventListener("click", () => {
  haptic.impact("light");
  if (examPickerStudentId && selectedExam) {
    const cur = examGradesMap.get(examPickerStudentId) || {};
    examGradesMap.set(examPickerStudentId, {
      ...cur,
      value: null,
      modifier: null
    });
    isGradeExamDirty = true;
    renderSelectedExamGrades();
    syncSaveBarForCurrentScreen();
  }
  sheetExamGradePicker?.classList.add("hidden");
  updateBackButton();
});

// ====================================================
// 5. O'QITUVCHI PROFILI (Teacher Profile Modal)
// ====================================================
const modalTeacherProfile = document.getElementById("modalTeacherProfile");
const btnTeacherProfile = document.getElementById("btnTeacherProfile");
const btnCloseTeacherProfile = document.getElementById("btnCloseTeacherProfile");
const teacherTotalLessons = document.getElementById("teacherTotalLessons");
const teacherTotalExams = document.getElementById("teacherTotalExams");
const teacherMonthTitle = document.getElementById("teacherMonthTitle");
const teacherLessonsList = document.getElementById("teacherLessonsList");
const teacherExamsList = document.getElementById("teacherExamsList");
const btnTeacherTabLessons = document.getElementById("btnTeacherTabLessons");
const btnTeacherTabExams = document.getElementById("btnTeacherTabExams");

let teacherCalYear = new Date().getFullYear();
let teacherCalMonth = new Date().getMonth();
let teacherCurrentTab = "lessons"; // lessons | exams

btnTeacherProfile?.addEventListener("click", () => {
  haptic.impact("light");
  openTeacherProfile();
});

btnCloseTeacherProfile?.addEventListener("click", () => {
  haptic.impact("light");
  modalTeacherProfile?.classList.add("hidden");
  updateBackButton();
});

btnTeacherTabLessons?.addEventListener("click", () => {
  if (teacherCurrentTab === "lessons") return;
  haptic.selection();
  teacherCurrentTab = "lessons";
  btnTeacherTabLessons.classList.add("active");
  btnTeacherTabExams.classList.remove("active");
  teacherLessonsList.classList.remove("hidden");
  teacherExamsList.classList.add("hidden");
});

btnTeacherTabExams?.addEventListener("click", () => {
  if (teacherCurrentTab === "exams") return;
  haptic.selection();
  teacherCurrentTab = "exams";
  btnTeacherTabExams.classList.add("active");
  btnTeacherTabLessons.classList.remove("active");
  teacherExamsList.classList.remove("hidden");
  teacherLessonsList.classList.add("hidden");
});

document.getElementById("btnTeacherMonthPrev")?.addEventListener("click", () => {
  haptic.impact("light");
  teacherCalMonth--;
  if (teacherCalMonth < 0) {
    teacherCalMonth = 11;
    teacherCalYear--;
  }
  loadTeacherProfileData();
});

document.getElementById("btnTeacherMonthNext")?.addEventListener("click", () => {
  haptic.impact("light");
  teacherCalMonth++;
  if (teacherCalMonth > 11) {
    teacherCalMonth = 0;
    teacherCalYear++;
  }
  loadTeacherProfileData();
});

function openTeacherProfile() {
  modalTeacherProfile?.classList.remove("hidden");
  updateBackButton();
  loadTeacherProfileData();
}

async function loadTeacherProfileData() {
  const mStr = String(teacherCalMonth + 1).padStart(2, "0");
  const monthQuery = `${teacherCalYear}-${mStr}`;
  teacherMonthTitle.textContent = `${MONTH_NAMES_UZ[teacherCalMonth]} ${teacherCalYear}`;

  try {
    const data = await apiRequest(`/api/teacher/profile?month=${monthQuery}`);

    teacherTotalLessons.textContent = String(data.total_lessons ?? 0);
    teacherTotalExams.textContent = String(data.total_exams ?? 0);

    // Darslar ro'yxati: Dushanba-Juma ish kunlari
    teacherLessonsList.replaceChildren();
    const workdays = data.workdays || [];

    if (workdays.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-title";
      emptyDiv.style.padding = "20px";
      emptyDiv.style.textAlign = "center";
      emptyDiv.textContent = "Darslar mavjud emas";
      teacherLessonsList.appendChild(emptyDiv);
    } else {
      workdays.forEach((wd) => {
        const card = document.createElement("div");
        card.className = "teacher-day-card";

        const header = document.createElement("div");
        header.className = "teacher-day-header";

        const dateObj = new Date(wd.date);
        const dayOfWeekIdx = (dateObj.getDay() + 6) % 7; // 0=Dushanba, 4=Juma
        const weekdayName = WEEKDAYS_UZ[dayOfWeekIdx] || "";

        header.textContent = `${formatDisplayDate(wd.date)} (${weekdayName})`;
        card.appendChild(header);

        // 1-dars
        const row1 = document.createElement("div");
        row1.className = "teacher-lesson-row";
        const l1Label = document.createElement("span");
        l1Label.className = "teacher-lesson-num";
        l1Label.textContent = "1-dars 07:00:";
        const l1Topic = document.createElement("span");
        l1Topic.className = "teacher-lesson-topic";
        l1Topic.textContent = wd.lesson_1?.topic || "Dars o'tilmagan";
        if (!wd.lesson_1?.topic) l1Topic.style.color = "var(--text-muted)";
        row1.appendChild(l1Label);
        row1.appendChild(l1Topic);
        card.appendChild(row1);

        // 2-dars
        const row2 = document.createElement("div");
        row2.className = "teacher-lesson-row";
        const l2Label = document.createElement("span");
        l2Label.className = "teacher-lesson-num";
        l2Label.textContent = "2-dars 15:45:";
        const l2Topic = document.createElement("span");
        l2Topic.className = "teacher-lesson-topic";
        l2Topic.textContent = wd.lesson_2?.topic || "Dars o'tilmagan";
        if (!wd.lesson_2?.topic) l2Topic.style.color = "var(--text-muted)";
        row2.appendChild(l2Label);
        row2.appendChild(l2Topic);
        card.appendChild(row2);

        teacherLessonsList.appendChild(card);
      });
    }

    // Imtihonlar ro'yxati
    teacherExamsList.replaceChildren();
    const exams = data.exams || [];

    if (exams.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-title";
      emptyDiv.style.padding = "20px";
      emptyDiv.style.textAlign = "center";
      emptyDiv.textContent = "Imtihonlar o'tkazilmagan";
      teacherExamsList.appendChild(emptyDiv);
    } else {
      exams.forEach((ex) => {
        const card = document.createElement("div");
        card.className = "teacher-exam-card";

        const topRow = document.createElement("div");
        topRow.className = "lesson-card-top";

        const title = document.createElement("div");
        title.className = "teacher-exam-title";
        title.textContent = ex.name;

        const badge = document.createElement("span");
        badge.className = "lesson-card-badge";
        badge.textContent = `${formatDisplayDate(ex.date)} (${ex.lesson_no}-dars)`;

        topRow.appendChild(title);
        topRow.appendChild(badge);

        const sub = document.createElement("div");
        sub.className = "teacher-exam-sub";
        sub.textContent = ex.topic;

        card.appendChild(topRow);
        card.appendChild(sub);

        card.style.cursor = "pointer";
        card.onclick = async () => {
          haptic.impact("light");
          modalTeacherProfile?.classList.add("hidden");
          updateBackButton();
          await switchTab("tabGrades");
          document.getElementById("btnGradeKindExam")?.click();
          currentGradeDate = ex.date;
          selectedExam = ex;
          renderGradesCalendar();
          await loadExamGrades(ex.id);
        };

        teacherExamsList.appendChild(card);
      });
    }
  } catch (err) {
    console.warn("O'qituvchi profilini yuklashda xato:", err);
  }
}

// ====================================================
// 6. SOZLAMALAR BO'LIMI (PAROL ALMASHTIRISH VA MANBALAR)
// ====================================================
const formChangePassword = document.getElementById("formChangePassword");
formChangePassword?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const oldPassword = document.getElementById("oldPasswordInput").value;
  const newPassword = document.getElementById("newPasswordInput").value;
  const confirmPassword = document.getElementById("confirmPasswordInput").value;

  if (newPassword.length < 4) {
    showToast("Yangi kod kamida 4 ta belgidan iborat bo'lishi kerak", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("Yangi kodlar bir-biriga mos kelmadi", "error");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitPassword");
  const origText = btnSubmit.textContent;
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Saqlanmoqda...";

  const payload = {
    old_password: oldPassword,
    new_password: newPassword,
    confirm_password: confirmPassword
  };

  try {
    await apiRequest("/api/admin/password", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    haptic.notification("success");
    showToast("Xavfsizlik kodi muvaffaqiyatli yangilandi", "success");

    document.getElementById("oldPasswordInput").value = "";
    document.getElementById("newPasswordInput").value = "";
    document.getElementById("confirmPasswordInput").value = "";
  } catch (err) {
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = origText;
  }
});

document.getElementById("btnSettingsLogout")?.addEventListener("click", async () => {
  haptic.impact("medium");
  const confirmed = await confirmAction(
    "Admin paneldan chiqishni xohlaysizmi?",
    "Chiqish"
  );

  if (confirmed) {
    try {
      await apiRequest("/api/admin/logout", { method: "POST" });
    } catch (err) {
    } finally {
      if (tg) tg.close();
    }
  }
});

// ====================================================
// MANBALAR BILAN ISHLASH (MODAL VA CRUD)
// ====================================================
const modalSource = document.getElementById("modalSource");
const formSource = document.getElementById("formSource");

function openAddSourceModal() {
  document.getElementById("modalSourceTitle").textContent = "Manba qo'shish";
  document.getElementById("sourceId").value = "";
  document.getElementById("sourceAddFields").classList.remove("hidden");
  document.getElementById("sourceEditFields").classList.add("hidden");
  document.getElementById("sourceTitle").value = "";
  document.getElementById("sourceText").value = "";
  modalSource?.classList.remove("hidden");
  updateBackButton();
}

function openEditSourceModal(src) {
  document.getElementById("modalSourceTitle").textContent = "Manbani tahrirlash";
  document.getElementById("sourceId").value = src.id;
  document.getElementById("sourceAddFields").classList.add("hidden");
  document.getElementById("sourceEditFields").classList.remove("hidden");

  document.getElementById("sourceTitleUz").value = src.title_uz;
  document.getElementById("sourceTextUz").value = src.text_uz;
  document.getElementById("sourceTitleEn").value = src.title_en;
  document.getElementById("sourceTextEn").value = src.text_en;
  document.getElementById("sourceTitleRu").value = src.title_ru;
  document.getElementById("sourceTextRu").value = src.text_ru;

  switchLangPane("uz");
  modalSource?.classList.remove("hidden");
  updateBackButton();
}

document.getElementById("btnCloseSourceModal")?.addEventListener("click", () => {
  haptic.impact("light");
  modalSource?.classList.add("hidden");
  updateBackButton();
});

document.querySelectorAll(".lang-tab-item").forEach((btn) => {
  btn.onclick = () => {
    haptic.selection();
    const lang = btn.getAttribute("data-lang");
    switchLangPane(lang);
  };
});

function switchLangPane(lang) {
  document.querySelectorAll(".lang-tab-item").forEach((b) => {
    if (b.getAttribute("data-lang") === lang) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  document.querySelectorAll(".lang-pane").forEach((pane) => {
    pane.classList.remove("active");
  });

  const activePane = document.getElementById(`pane${lang.charAt(0).toUpperCase() + lang.slice(1)}`);
  activePane?.classList.add("active");
}

formSource?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const saveBtn = document.getElementById("btnSaveSource");
  const origText = saveBtn.textContent;
  const id = document.getElementById("sourceId").value;

  if (id) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saqlanmoqda...";

    const payload = {
      title_uz: document.getElementById("sourceTitleUz").value.trim(),
      text_uz: document.getElementById("sourceTextUz").value.trim(),
      title_en: document.getElementById("sourceTitleEn").value.trim(),
      text_en: document.getElementById("sourceTextEn").value.trim(),
      title_ru: document.getElementById("sourceTitleRu").value.trim(),
      text_ru: document.getElementById("sourceTextRu").value.trim(),
      position: 0
    };

    try {
      await apiRequest(`/api/sources/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      haptic.notification("success");
      showToast("Manba yangilandi", "success");
      modalSource?.classList.add("hidden");
      updateBackButton();
      loadHomeSources();
    } catch (err) {
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  } else {
    saveBtn.disabled = true;
    saveBtn.textContent = "Tarjima qilinmoqda...";

    const payload = {
      title: document.getElementById("sourceTitle").value.trim(),
      text: document.getElementById("sourceText").value.trim(),
      source_lang: document.getElementById("sourceLang").value
    };

    try {
      await apiRequest("/api/sources", { method: "POST", body: JSON.stringify(payload) });
      haptic.notification("success");
      showToast("Yangi manba qo'shildi", "success");
      modalSource?.classList.add("hidden");
      updateBackButton();
      loadHomeSources();
    } catch (err) {
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  }
});

// ====================================================
// Dastlabki Yuklanish
// ====================================================
fetchStatus();
switchTab("tabHome");
