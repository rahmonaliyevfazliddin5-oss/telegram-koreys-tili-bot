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

  // 1. Ochiq profil modalini yopish
  const profileModal = document.getElementById("modalStudentProfile");
  if (profileModal && !profileModal.classList.contains("hidden")) {
    profileModal.classList.add("hidden");
    updateBackButton();
    return;
  }

  // 2. Ochiq bottom sheet yoki modalni yopish
  const anyOpenModal = document.querySelector(".modal-overlay:not(.hidden), .bottom-sheet-overlay:not(.hidden)");
  if (anyOpenModal) {
    closeAllSheetsAndModals();
    return;
  }

  // 3. Agar bosh sahifada bo'lmasa, Bosh sahifaga qaytish
  if (currentTabId !== "tabHome") {
    switchTab("tabHome");
    return;
  }

  // 4. Bosh sahifada orqaga bosilganda POST /api/admin/logout va WebApp.close()
  try {
    await apiRequest("/api/admin/logout", { method: "POST" });
  } catch (err) {
    console.warn("Logout xatosi:", err);
  } finally {
    if (tg) tg.close();
  }
}

function updateBackButton() {
  if (!tg?.BackButton) return;
  const profileModal = document.getElementById("modalStudentProfile");
  const isProfileOpen = profileModal && !profileModal.classList.contains("hidden");
  const anyModal = document.querySelector(".modal-overlay:not(.hidden), .bottom-sheet-overlay:not(.hidden)");

  if (isProfileOpen || anyModal || currentTabId !== "tabHome") {
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
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }));
      throw new Error(err.detail || "Xatolik yuz berdi");
    }
    return await response.json();
  } catch (err) {
    if (err.message !== "Ruxsat berilmagan") {
      haptic.notification("error");
      showToast(err.message, "error");
    }
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
let currentTabId = "tabHome";

function switchTab(tabId) {
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
    else if (tabId === "tabAttendance") headerTitle.textContent = "Davomat";
    else if (tabId === "tabGrades") headerTitle.textContent = "Baholash";
    else if (tabId === "tabSettings") headerTitle.textContent = "Sozlamalar";
  }

  // FAB ko'rinishi: FAQAT O'quvchilar sahifasida
  if (currentTabId === "tabStudents") {
    fabAdd?.classList.remove("hidden");
  } else {
    fabAdd?.classList.add("hidden");
  }

  updateBackButton();

  if (tabId === "tabHome") loadHomeDashboard();
  else if (tabId === "tabStudents") loadStudents();
  else if (tabId === "tabAttendance") {
    renderAttendanceCalendar();
    loadAttendance();
  } else if (tabId === "tabGrades") {
    renderGradesCalendar();
    loadGrades();
  }
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

// ====================================================
// Sanalar va Vaqt Formati (24-soatlik format)
// ====================================================
const MONTH_NAMES_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

function getTodayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  block_ttl: 0
};

function computeLocalTashkentStatus() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tashkentDate = new Date(utc + 3600000 * 5);

  const day = tashkentDate.getDay();
  const is_weekend = day === 0 || day === 6;

  const hours = tashkentDate.getHours();
  const minutes = tashkentDate.getMinutes();
  const timeNum = hours * 60 + minutes;

  const lesson1_open = !is_weekend && timeNum >= 420 && timeNum <= 720;
  const lesson2_open = !is_weekend && timeNum >= 930 && timeNum <= 1200;

  const active_lesson = timeNum >= 840 ? 2 : 1;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return {
    is_weekend,
    lesson1_open,
    lesson2_open,
    active_lesson,
    current_time: timeStr
  };
}

async function fetchStatus() {
  try {
    const data = await apiRequest("/api/status");
    if (data) {
      systemStatus.is_weekend = Boolean(data.is_weekend);
      systemStatus.current_time = data.current_time || data.server_time || "";
      systemStatus.is_blocked = Boolean(data.is_blocked);
      systemStatus.block_ttl = data.block_ttl || 0;
      systemStatus.active_lesson = data.active_lesson || 1;

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
    const fallback = computeLocalTashkentStatus();
    systemStatus.is_weekend = fallback.is_weekend;
    systemStatus.lesson1_open = fallback.lesson1_open;
    systemStatus.lesson2_open = fallback.lesson2_open;
    systemStatus.active_lesson = fallback.active_lesson;
    systemStatus.current_time = fallback.current_time;
  } finally {
    const timeBadge = document.getElementById("headerTimeBadge");
    if (timeBadge && systemStatus.current_time) {
      timeBadge.textContent = systemStatus.current_time;
    }
    updateWindowStatusUI();
    if (currentTabId === "tabHome") {
      updateHomeStatusBanner();
    }
  }
}

setInterval(fetchStatus, 30000);
window.addEventListener("focus", () => {
  fetchStatus();
});

function isLessonWindowOpen(lesson) {
  if (systemStatus.is_weekend) return false;
  if (lesson === 1) return systemStatus.lesson1_open;
  if (lesson === 2) return systemStatus.lesson2_open;
  return false;
}

function updateWindowStatusUI() {
  // Davomat oynasi holati
  const attBanner = document.getElementById("attWindowBanner");
  const attText = document.getElementById("attStatusText");
  const isAttOpen = isLessonWindowOpen(currentAttLesson);

  if (attBanner && attText) {
    attBanner.classList.remove("status-open", "status-closed");
    if (systemStatus.is_weekend) {
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

  // Yopiq dars oynasida qora tugmalar
  const btnSaveAtt = document.getElementById("btnSaveAttendance");
  if (btnSaveAtt) {
    btnSaveAtt.disabled = !isAttOpen;
    if (!isAttOpen) {
      btnSaveAtt.classList.add("is-disabled-window");
    } else {
      btnSaveAtt.classList.remove("is-disabled-window");
    }
  }

  document.querySelectorAll(".btn-attendance-absent-toggle").forEach((btn) => {
    btn.disabled = !isAttOpen;
    if (!isAttOpen) {
      btn.classList.add("is-disabled-window");
    } else {
      btn.classList.remove("is-disabled-window");
    }
  });

  // Baholash oynasi holati
  const gradeBanner = document.getElementById("gradeWindowBanner");
  const gradeText = document.getElementById("gradeStatusText");
  const isGradeOpen = isLessonWindowOpen(currentGradeLesson);

  if (gradeBanner && gradeText) {
    gradeBanner.classList.remove("status-open", "status-closed");
    if (systemStatus.is_weekend) {
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

  const btnSaveGrade = document.getElementById("btnSaveGrades");
  if (btnSaveGrade) {
    btnSaveGrade.disabled = !isGradeOpen;
    if (!isGradeOpen) {
      btnSaveGrade.classList.add("is-disabled-window");
    } else {
      btnSaveGrade.classList.remove("is-disabled-window");
    }
  }

  document.querySelectorAll(".grade-btn-val").forEach((btn) => {
    btn.disabled = !isGradeOpen;
    if (!isGradeOpen) {
      btn.classList.add("is-disabled-window");
    } else {
      btn.classList.remove("is-disabled-window");
    }
  });
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
    const res = await apiRequest(`/api/attendance?date=${todayStr}&lesson=${activeLesson}`);

    let total = 0;
    let absent = 0;
    let present = 0;
    let percentage = 0;

    if (res) {
      total = res.total_students ?? 0;
      absent = res.absent_count ?? (res.absent_ids ? res.absent_ids.length : 0);
      present = res.present_count ?? Math.max(0, total - absent);

      if (res.percentage !== undefined) {
        percentage = Math.round(res.percentage);
      } else if (total > 0) {
        percentage = Math.round((present / total) * 100);
      }
    }

    if (presentEl) presentEl.textContent = String(present);
    if (absentEl) absentEl.textContent = String(absent);
    if (totalEl) totalEl.textContent = String(total);
    if (percentText) percentText.textContent = `${percentage}%`;

    // Halqani to'ldirish (radius 46 => aylana uzunligi = 2 * PI * 46 ≈ 289)
    if (ringFill) {
      const circumference = 289;
      const offset = circumference - (percentage / 100) * circumference;
      ringFill.style.strokeDashoffset = String(offset);
    }
  } catch (err) {
    console.error("Halqali davomatni yuklashda xato:", err);
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

// Tezkor o'tish tugmalari
document.getElementById("btnQuickAttendance")?.addEventListener("click", () => {
  haptic.selection();
  switchTab("tabAttendance");
});

document.getElementById("btnQuickGrades")?.addEventListener("click", () => {
  haptic.selection();
  switchTab("tabGrades");
});

// ====================================================
// 2. O'QUVCHILAR BO'LIMI VA PROFIL
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

async function loadStudents() {
  studentsLoaderEl?.classList.remove("hidden");
  try {
    const query = studentSearchInput.value.trim();
    const endpoint = query ? `/api/students?search=${encodeURIComponent(query)}` : "/api/students";
    allStudents = await apiRequest(endpoint);
    renderStudents();
  } catch (e) {
    console.error("O'quvchilarni yuklashda xato:", e);
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
  }, 240);
});

btnClearSearch?.addEventListener("click", () => {
  haptic.impact("light");
  studentSearchInput.value = "";
  btnClearSearch.classList.add("hidden");
  loadStudents();
});

function renderStudents() {
  studentsListEl.replaceChildren();

  if (!allStudents || allStudents.length === 0) {
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

  allStudents.forEach((st) => {
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";

    const studentFullName = `${st.first_name || ""} ${st.last_name || ""}`.trim();

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

    if (st.grade && st.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${st.grade.trim()}`;
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

// O'quvchi Profili Modali (3 raqam kartasi, jarima, qarz undirish)
async function openStudentProfile(st) {
  selectedStudentForProfile = st;

  const profAvatar = document.getElementById("profAvatar");
  const profName = document.getElementById("profName");
  const profGrade = document.getElementById("profGrade");
  const profAbsences = document.getElementById("profTotalAbsences");
  const profScore = document.getElementById("profTotalScore");
  const profDebt = document.getElementById("profTotalDebt");
  const profHistoryList = document.getElementById("profHistoryList");
  const profHistoryCount = document.getElementById("profHistoryCount");

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

  if (profAbsences) profAbsences.textContent = "...";
  if (profScore) profScore.textContent = "...";
  if (profDebt) profDebt.textContent = "...";
  if (profHistoryList) profHistoryList.replaceChildren();

  modalStudentProfile?.classList.remove("hidden");
  updateBackButton();

  await reloadProfileData(st.id);
}

async function reloadProfileData(studentId) {
  const profAbsences = document.getElementById("profTotalAbsences");
  const profScore = document.getElementById("profTotalScore");
  const profDebt = document.getElementById("profTotalDebt");
  const profHistoryList = document.getElementById("profHistoryList");
  const profHistoryCount = document.getElementById("profHistoryCount");

  try {
    const data = await apiRequest(`/api/students/${studentId}/profile`);

    const totalAbsences = data.total_absences ?? data.stats?.total_absences ?? 0;
    const totalScore = data.total_score ?? data.stats?.total_score ?? 0;
    const totalDebt = data.total_debt ?? data.stats?.total_debt ?? 0;
    const history = data.history || [];

    if (profAbsences) profAbsences.textContent = `${totalAbsences} ta`;
    if (profScore) profScore.textContent = `${totalScore} ball`;
    if (profDebt) profDebt.textContent = `${Number(totalDebt).toLocaleString("uz-UZ")} so'm`;
    if (profHistoryCount) profHistoryCount.textContent = `${history.length} ta amal`;

    if (profHistoryList) {
      profHistoryList.replaceChildren();

      if (!history || history.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "empty-card";
        emptyDiv.style.padding = "20px";
        const emptyTitle = document.createElement("div");
        emptyTitle.className = "empty-title";
        emptyTitle.textContent = "Amallar tarixi mavjud emas";
        emptyDiv.appendChild(emptyTitle);
        profHistoryList.appendChild(emptyDiv);
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
          profHistoryList.appendChild(row);
        });
      }
    }
  } catch (err) {
    console.error("Profil ma'lumotlarini yuklashda xato:", err);
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
  haptic.impact("medium");

  const studentName = `${selectedStudentForProfile.first_name || ""} ${selectedStudentForProfile.last_name || ""}`.trim();
  const confirmed = await confirmAction(
    `"${studentName}" o'quvchisiga 10 000 so'm jarima belgilashni tasdiqlaysizmi?`,
    "Jarima belgilash"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/students/${selectedStudentForProfile.id}/fine`, {
        method: "POST",
        body: JSON.stringify({ amount: 10000 })
      });
      haptic.notification("success");
      showToast("10 000 so'm jarima belgilandi", "success");
      await reloadProfileData(selectedStudentForProfile.id);
    } catch (err) {}
  }
});

// Qarz undirish (bottom sheet, summa input, confirm)
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
      body: JSON.stringify({ amount: amount })
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

document.getElementById("btnProfileDelete")?.addEventListener("click", async () => {
  if (!selectedStudentForProfile) return;
  haptic.impact("medium");

  const name = `${selectedStudentForProfile.first_name || ""} ${selectedStudentForProfile.last_name || ""}`.trim();
  const confirmed = await confirmAction(
    `"${name}" o'quvchisini butunlay o'chirishni tasdiqlaysizmi?`,
    "O'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/students/${selectedStudentForProfile.id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("O'quvchi o'chirildi", "success");
      modalStudentProfile?.classList.add("hidden");
      updateBackButton();
      loadStudents();
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
// 3. DAVOMAT BO'LIMI: 2 TA DARS TABI, FAQAT BITTA "KELMADI"
// ====================================================
let currentAttDate = getTodayString();
let currentAttLesson = 1; // 1 | 2
let currentAttCalYear = new Date().getFullYear();
let currentAttCalMonth = new Date().getMonth();
let attendanceMonthCache = {};

const attendanceListEl = document.getElementById("attendanceList");
const attendanceLoaderEl = document.getElementById("attendanceLoader");
const attCalMonthTitleEl = document.getElementById("attCalMonthTitle");
const attCalendarGridEl = document.getElementById("attCalendarGrid");
const attSelectedDateTitleEl = document.getElementById("attSelectedDateTitle");
const attSummaryStatEl = document.getElementById("attSummaryStat");

document.getElementById("btnAttLesson1")?.addEventListener("click", () => {
  if (currentAttLesson === 1) return;
  haptic.selection();
  currentAttLesson = 1;
  document.getElementById("btnAttLesson1")?.classList.add("active");
  document.getElementById("btnAttLesson2")?.classList.remove("active");
  updateWindowStatusUI();
  loadAttendance();
});

document.getElementById("btnAttLesson2")?.addEventListener("click", () => {
  if (currentAttLesson === 2) return;
  haptic.selection();
  currentAttLesson = 2;
  document.getElementById("btnAttLesson2")?.classList.add("active");
  document.getElementById("btnAttLesson1")?.classList.remove("active");
  updateWindowStatusUI();
  loadAttendance();
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

    dayEl.onclick = () => {
      haptic.selection();
      currentAttDate = fullDate;
      renderAttendanceCalendar();
      loadAttendance();
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

let attAbsenceSet = new Set();
let attStudentsList = [];

async function loadAttendance() {
  attendanceLoaderEl?.classList.remove("hidden");
  if (attSelectedDateTitleEl) {
    attSelectedDateTitleEl.textContent = formatDisplayDate(currentAttDate);
  }

  try {
    const endpoint = `/api/attendance?date=${currentAttDate}&lesson=${currentAttLesson}`;
    const res = await apiRequest(endpoint);

    attAbsenceSet.clear();

    if (Array.isArray(res)) {
      attStudentsList = res;
      res.forEach((st) => {
        if (st.is_absent || st.status === "absent") {
          attAbsenceSet.add(st.student_id || st.id);
        }
      });
    } else if (res && typeof res === "object") {
      attStudentsList = res.students || [];
      if (res.absent_student_ids && Array.isArray(res.absent_student_ids)) {
        res.absent_student_ids.forEach((id) => attAbsenceSet.add(id));
      } else if (res.absent_ids && Array.isArray(res.absent_ids)) {
        res.absent_ids.forEach((id) => attAbsenceSet.add(id));
      } else {
        attStudentsList.forEach((st) => {
          if (st.is_absent || st.status === "absent") {
            attAbsenceSet.add(st.student_id || st.id);
          }
        });
      }
    }

    if ((!attStudentsList || attStudentsList.length === 0) && allStudents.length > 0) {
      attStudentsList = allStudents.map((s) => ({
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        grade: s.grade
      }));
    }

    renderAttendanceList();
  } catch (e) {
    console.error("Davomatni yuklashda xato:", e);
  } finally {
    attendanceLoaderEl?.classList.add("hidden");
    updateWindowStatusUI();
  }
}

function renderAttendanceList() {
  attendanceListEl.replaceChildren();

  const total = attStudentsList ? attStudentsList.length : 0;
  const absentCount = attAbsenceSet.size;
  const presentCount = Math.max(0, total - absentCount);

  if (attSummaryStatEl) {
    attSummaryStatEl.textContent = `Keldi: ${presentCount} / ${total}`;
  }

  if (total > 0) {
    attendanceMonthCache[currentAttDate] = {
      has_absent: absentCount > 0,
      is_saved: true
    };
    renderAttendanceCalendar();
  }

  if (!attStudentsList || attStudentsList.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card empty-card";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon-wrap";
    emptyIcon.appendChild(createSvgIcon("calendar", 24));

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";

    emptyCard.appendChild(emptyIcon);
    emptyCard.appendChild(emptyTitle);
    attendanceListEl.appendChild(emptyCard);
    return;
  }

  const isWindowOpen = isLessonWindowOpen(currentAttLesson);

  attStudentsList.forEach((st) => {
    const sId = st.student_id || st.id;
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";

    const studentFullName = `${st.first_name || ""} ${st.last_name || ""}`.trim();

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

    if (st.grade && st.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${st.grade.trim()}`;
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    // FAQAT bitta 'Kelmadi' tugmasi (bosilsa qizil, qayta bosilsa bekor)
    const btnAbsent = document.createElement("button");
    btnAbsent.type = "button";
    btnAbsent.className = "btn-attendance-absent-toggle";
    btnAbsent.textContent = "Kelmadi";

    const isAbsent = attAbsenceSet.has(sId);
    if (isAbsent) {
      btnAbsent.classList.add("is-absent");
    }

    // Yopiq dars oynasida qora tugmalar
    if (!isWindowOpen) {
      btnAbsent.disabled = true;
      btnAbsent.classList.add("is-disabled-window");
    }

    btnAbsent.onclick = (e) => {
      e.stopPropagation();
      if (!isLessonWindowOpen(currentAttLesson)) {
        showToast("Dars oynasi yopiq, o'zgartirish taqiqlangan", "error");
        return;
      }

      haptic.impact("light");

      if (attAbsenceSet.has(sId)) {
        attAbsenceSet.delete(sId);
        btnAbsent.classList.remove("is-absent");
      } else {
        attAbsenceSet.add(sId);
        btnAbsent.classList.add("is-absent");
      }

      const curAbsentCount = attAbsenceSet.size;
      const curPresentCount = Math.max(0, total - curAbsentCount);
      if (attSummaryStatEl) {
        attSummaryStatEl.textContent = `Keldi: ${curPresentCount} / ${total}`;
      }
    };

    card.appendChild(cardLeft);
    card.appendChild(btnAbsent);
    attendanceListEl.appendChild(card);
  });
}

// Davomat: Katta qizil Saqlash tugmasi
document.getElementById("btnSaveAttendance")?.addEventListener("click", async () => {
  if (!isLessonWindowOpen(currentAttLesson)) {
    showToast("Dars oynasi yopiq, saqlash taqiqlangan", "error");
    return;
  }

  haptic.impact("medium");
  const btnSave = document.getElementById("btnSaveAttendance");
  const btnText = document.getElementById("btnSaveAttendanceText");
  const origText = btnText ? btnText.textContent : "Saqlash";

  if (btnSave) btnSave.disabled = true;
  if (btnText) btnText.textContent = "Saqlanmoqda...";

  const absentList = Array.from(attAbsenceSet);
  const payload = {
    date: currentAttDate,
    lesson: currentAttLesson,
    absences: absentList,
    absent_student_ids: absentList
  };

  try {
    await apiRequest("/api/attendance", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    haptic.notification("success");
    showToast("Davomat muvaffaqiyatli saqlandi", "success");
    await loadAttendance();
  } catch (err) {
  } finally {
    if (btnSave) btnSave.disabled = !isLessonWindowOpen(currentAttLesson);
    if (btnText) btnText.textContent = origText;
  }
});

// ====================================================
// 4. BAHOLASH BO'LIMI: 1-5 VA KATTA QIZIL SAQLASH
// ====================================================
let currentGradeDate = getTodayString();
let currentGradeLesson = 1; // 1 | 2
let currentGradeKind = "daily"; // daily | exam
let currentGradeCalYear = new Date().getFullYear();
let currentGradeCalMonth = new Date().getMonth();
let gradesMonthCache = {};

const gradesListEl = document.getElementById("gradesList");
const gradesLoaderEl = document.getElementById("gradesLoader");
const gradeCalMonthTitleEl = document.getElementById("gradeCalMonthTitle");
const gradeCalendarGridEl = document.getElementById("gradeCalendarGrid");
const gradeSelectedDateTitleEl = document.getElementById("gradeSelectedDateTitle");
const gradeSummaryStatEl = document.getElementById("gradeSummaryStat");

document.getElementById("btnGradeLesson1")?.addEventListener("click", () => {
  if (currentGradeLesson === 1) return;
  haptic.selection();
  currentGradeLesson = 1;
  document.getElementById("btnGradeLesson1")?.classList.add("active");
  document.getElementById("btnGradeLesson2")?.classList.remove("active");
  updateWindowStatusUI();
  loadGrades();
});

document.getElementById("btnGradeLesson2")?.addEventListener("click", () => {
  if (currentGradeLesson === 2) return;
  haptic.selection();
  currentGradeLesson = 2;
  document.getElementById("btnGradeLesson2")?.classList.add("active");
  document.getElementById("btnGradeLesson1")?.classList.remove("active");
  updateWindowStatusUI();
  loadGrades();
});

document.getElementById("btnGradeKindDaily")?.addEventListener("click", () => {
  if (currentGradeKind === "daily") return;
  haptic.selection();
  currentGradeKind = "daily";
  document.getElementById("btnGradeKindDaily")?.classList.add("active");
  document.getElementById("btnGradeKindExam")?.classList.remove("active");
  loadGrades();
});

document.getElementById("btnGradeKindExam")?.addEventListener("click", () => {
  if (currentGradeKind === "exam") return;
  haptic.selection();
  currentGradeKind = "exam";
  document.getElementById("btnGradeKindExam")?.classList.add("active");
  document.getElementById("btnGradeKindDaily")?.classList.remove("active");
  loadGrades();
});

function renderGradesCalendar() {
  if (!gradeCalendarGridEl) return;
  gradeCalendarGridEl.replaceChildren();

  if (gradeCalMonthTitleEl) {
    gradeCalMonthTitleEl.textContent = `${MONTH_NAMES_UZ[currentGradeCalMonth]} ${currentGradeCalYear}`;
  }

  const firstDay = new Date(currentGradeCalYear, currentGradeCalMonth, 1).getDay();
  const startingDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentGradeCalYear, currentGradeCalMonth + 1, 0).getDate();

  for (let i = 0; i < startingDay; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.className = "cal-day empty";
    gradeCalendarGridEl.appendChild(emptySlot);
  }

  const todayStr = getTodayString();

  for (let day = 1; day <= daysInMonth; day++) {
    const mStr = String(currentGradeCalMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const fullDate = `${currentGradeCalYear}-${mStr}-${dStr}`;

    const dayEl = document.createElement("div");
    dayEl.className = "cal-day";
    dayEl.textContent = String(day);

    if (fullDate === todayStr) {
      dayEl.classList.add("today");
    }
    if (fullDate === currentGradeDate) {
      dayEl.classList.add("selected");
    }

    if (gradesMonthCache[fullDate]) {
      const dot = document.createElement("span");
      dot.className = "cal-day-dot dot-green";
      dayEl.appendChild(dot);
    }

    dayEl.onclick = () => {
      haptic.selection();
      currentGradeDate = fullDate;
      renderGradesCalendar();
      loadGrades();
    };

    gradeCalendarGridEl.appendChild(dayEl);
  }
}

document.getElementById("btnGradeCalPrev")?.addEventListener("click", () => {
  haptic.impact("light");
  currentGradeCalMonth--;
  if (currentGradeCalMonth < 0) {
    currentGradeCalMonth = 11;
    currentGradeCalYear--;
  }
  renderGradesCalendar();
});

document.getElementById("btnGradeCalNext")?.addEventListener("click", () => {
  haptic.impact("light");
  currentGradeCalMonth++;
  if (currentGradeCalMonth > 11) {
    currentGradeCalMonth = 0;
    currentGradeCalYear++;
  }
  renderGradesCalendar();
});

let gradesMap = new Map();
let gradeStudentsList = [];

async function loadGrades() {
  gradesLoaderEl?.classList.remove("hidden");
  if (gradeSelectedDateTitleEl) {
    gradeSelectedDateTitleEl.textContent = formatDisplayDate(currentGradeDate);
  }

  try {
    const endpoint = `/api/grades?date=${currentGradeDate}&lesson=${currentGradeLesson}&kind=${currentGradeKind}`;
    const res = await apiRequest(endpoint);

    gradesMap.clear();

    if (Array.isArray(res)) {
      gradeStudentsList = res;
      res.forEach((g) => {
        if (g.value !== undefined && g.value !== null) {
          gradesMap.set(g.student_id, g.value);
        }
      });
    } else if (res && typeof res === "object") {
      gradeStudentsList = res.items || res.grades || [];
      const list = res.items || res.grades || [];
      list.forEach((g) => {
        if (g.value !== undefined && g.value !== null) {
          gradesMap.set(g.student_id, g.value);
        }
      });
    }

    if ((!gradeStudentsList || gradeStudentsList.length === 0) && allStudents.length > 0) {
      gradeStudentsList = allStudents.map((s) => ({
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        grade: s.grade
      }));
    }

    renderGradesList();
  } catch (e) {
    console.error("Baholarni yuklashda xato:", e);
  } finally {
    gradesLoaderEl?.classList.add("hidden");
    updateWindowStatusUI();
  }
}

function renderGradesList() {
  gradesListEl.replaceChildren();

  const total = gradeStudentsList ? gradeStudentsList.length : 0;
  const gradedCount = gradesMap.size;

  if (gradeSummaryStatEl) {
    gradeSummaryStatEl.textContent = `Baholangan: ${gradedCount} / ${total}`;
  }

  if (gradedCount > 0) {
    gradesMonthCache[currentGradeDate] = true;
    renderGradesCalendar();
  }

  if (!gradeStudentsList || gradeStudentsList.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card empty-card";
    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";
    emptyCard.appendChild(emptyTitle);
    gradesListEl.appendChild(emptyCard);
    return;
  }

  const isWindowOpen = isLessonWindowOpen(currentGradeLesson);

  gradeStudentsList.forEach((st) => {
    const sId = st.student_id || st.id;
    const card = document.createElement("div");
    card.className = "card student-row-card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";

    const studentFullName = `${st.first_name || ""} ${st.last_name || ""}`.trim();

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

    if (st.grade && st.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${st.grade.trim()}`;
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    const gradesGroup = document.createElement("div");
    gradesGroup.className = "grades-button-group";

    const currentVal = gradesMap.get(sId);

    [1, 2, 3, 4, 5].forEach((val) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "grade-btn-val";
      btn.textContent = String(val);

      if (val === 5) btn.classList.add("val-5");
      if (currentVal === val) btn.classList.add("active");

      // Yopiq dars oynasida qora tugmalar
      if (!isWindowOpen) {
        btn.disabled = true;
        btn.classList.add("is-disabled-window");
      }

      btn.onclick = (e) => {
        e.stopPropagation();
        if (!isLessonWindowOpen(currentGradeLesson)) {
          showToast("Dars oynasi yopiq, baholash taqiqlangan", "error");
          return;
        }

        haptic.impact("light");

        if (gradesMap.get(sId) === val) {
          gradesMap.delete(sId);
        } else {
          gradesMap.set(sId, val);
        }

        renderGradesList();
      };

      gradesGroup.appendChild(btn);
    });

    card.appendChild(cardLeft);
    card.appendChild(gradesGroup);
    gradesListEl.appendChild(card);
  });
}

// Baholar: Katta qizil Saqlash tugmasi
document.getElementById("btnSaveGrades")?.addEventListener("click", async () => {
  if (!isLessonWindowOpen(currentGradeLesson)) {
    showToast("Dars oynasi yopiq, saqlash taqiqlangan", "error");
    return;
  }

  haptic.impact("medium");
  const btnSave = document.getElementById("btnSaveGrades");
  const btnText = document.getElementById("btnSaveGradesText");
  const origText = btnText ? btnText.textContent : "Saqlash";

  if (btnSave) btnSave.disabled = true;
  if (btnText) btnText.textContent = "Saqlanmoqda...";

  const gradesListPayload = Array.from(gradesMap.entries()).map(([student_id, value]) => ({
    student_id,
    value
  }));

  const payload = {
    date: currentGradeDate,
    lesson: currentGradeLesson,
    kind: currentGradeKind,
    grades: gradesListPayload
  };

  try {
    await apiRequest("/api/grades", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    haptic.notification("success");
    showToast("Baholar muvaffaqiyatli saqlandi", "success");
    await loadGrades();
  } catch (err) {
  } finally {
    if (btnSave) btnSave.disabled = !isLessonWindowOpen(currentGradeLesson);
    if (btnText) btnText.textContent = origText;
  }
});

// ====================================================
// 5. SOZLAMALAR BO'LIMI (PAROL ALMASHTIRISH VA MANBALAR)
// ====================================================
document.querySelectorAll(".pwd-toggle-btn").forEach((btn) => {
  btn.onclick = () => {
    haptic.impact("light");
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    const eyeOpen = btn.querySelector(".eye-open");
    const eyeClosed = btn.querySelector(".eye-closed");

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      eyeOpen?.classList.add("hidden");
      eyeClosed?.classList.remove("hidden");
    } else {
      input.type = "password";
      eyeOpen?.classList.remove("hidden");
      eyeClosed?.classList.add("hidden");
    }
  };
});

const formChangePassword = document.getElementById("formChangePassword");
formChangePassword?.addEventListener("submit", async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const oldPassword = document.getElementById("pwdOld").value;
  const newPassword = document.getElementById("pwdNew").value;
  const confirmPassword = document.getElementById("pwdConfirm").value;

  if (newPassword.length < 4) {
    showToast("Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("Yangi parollar bir-biriga mos kelmadi", "error");
    return;
  }

  const btnSave = document.getElementById("btnSavePassword");
  const origText = btnSave.textContent;
  btnSave.disabled = true;
  btnSave.textContent = "Saqlanmoqda...";

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
    showToast("Parol muvaffaqiyatli almashtirildi", "success");

    document.getElementById("pwdOld").value = "";
    document.getElementById("pwdNew").value = "";
    document.getElementById("pwdConfirm").value = "";
  } catch (err) {
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = origText;
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
const sheetSourceActions = document.getElementById("sheetSourceActions");
const modalSource = document.getElementById("modalSource");
const formSource = document.getElementById("formSource");
let selectedSourceForAction = null;

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
  selectedSourceForAction = src;
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
