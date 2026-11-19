// Telegram WebApp integratsiyasi
const tg = window.Telegram?.WebApp;

if (tg) {
  try {
    tg.ready();
    tg.expand();
    if (typeof tg.enableClosingConfirmation === "function") {
      tg.enableClosingConfirmation();
    }
    if (typeof tg.setHeaderColor === "function") {
      tg.setHeaderColor("#4F46E5");
    }
    if (typeof tg.setBackgroundColor === "function") {
      tg.setBackgroundColor("#F4F6FA");
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

// Orqaga harakatini boshqarish
async function handleBackNavigation() {
  haptic.impact("light");
  const anyOpenModal = document.querySelector(".modal-overlay:not(.hidden), .bottom-sheet-overlay:not(.hidden)");
  if (anyOpenModal) {
    closeAllSheetsAndModals();
    return;
  }

  // Asosiy sahifalarda orqaga bosilganda POST /api/admin/logout chaqirilib, so'ng Telegram.WebApp.close() qilinadi
  try {
    await apiRequest("/api/admin/logout", { method: "POST" });
  } catch (err) {
    console.warn("Logout xatosi:", err);
  } finally {
    if (tg) {
      tg.close();
    }
  }
}

// Telegram orqaga (BackButton) boshqaruvi
function updateBackButton() {
  if (!tg?.BackButton) return;
  const anyOpenModal = document.querySelector(".modal-overlay:not(.hidden), .bottom-sheet-overlay:not(.hidden)");
  if (anyOpenModal) {
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

// Header'dagi orqaga (chevron-left) tugmasi
document.getElementById("btnHeaderBack")?.addEventListener("click", () => {
  handleBackNavigation();
});

// Yopish tugmasi
document.getElementById("btnClose")?.addEventListener("click", () => {
  haptic.impact("light");
  if (tg) {
    tg.close();
  }
});
document.getElementById("btnUnauthorizedClose")?.addEventListener("click", () => {
  haptic.impact("light");
  if (tg) {
    tg.close();
  }
});

// Toast xabarnoma ko'rsatish
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
  }, 2500);
}

// In-App Tasdiqlash oynasi (Confirm)
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

// Barcha modal va bottom sheetlarni yopish
function closeAllSheetsAndModals() {
  document.querySelectorAll(".modal-overlay, .bottom-sheet-overlay").forEach((el) => {
    el.classList.add("hidden");
  });
  updateBackButton();
}

// Backdrop yoki tutqichni bosganda yopish
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

// Telegram initData
const initData = tg?.initData || "";

// Xavfsiz API so'rov yuborish
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

// Tablarni almashtirish
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");
const fabAdd = document.getElementById("fabAdd");
let currentTabId = "tabStudents";

function updateFabVisibility() {
  if (currentTabId === "tabStudents" || currentTabId === "tabSources") {
    fabAdd?.classList.remove("hidden");
  } else {
    fabAdd?.classList.add("hidden");
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    haptic.selection();

    navItems.forEach((n) => n.classList.remove("active"));
    tabContents.forEach((t) => t.classList.remove("active"));

    item.classList.add("active");
    currentTabId = item.getAttribute("data-tab");
    document.getElementById(currentTabId)?.classList.add("active");

    updateFabVisibility();

    if (currentTabId === "tabStudents") loadStudents();
    if (currentTabId === "tabAttendance") {
      renderAttendanceCalendar();
      loadAttendance();
    }
    if (currentTabId === "tabGrades") {
      renderGradesCalendar();
      loadGrades();
    }
    if (currentTabId === "tabSources") loadSources();
  });
});

// FAB bosilganda
fabAdd?.addEventListener("click", () => {
  haptic.impact("light");
  if (currentTabId === "tabStudents") {
    openAddStudentModal();
  } else if (currentTabId === "tabSources") {
    openAddSourceModal();
  }
});

// Ism bosh harflaridan avatar uchun rang tanlash
const AVATAR_COLORS = [
  "linear-gradient(135deg, #4F46E5, #7C3AED)",
  "linear-gradient(135deg, #2563EB, #38BDF8)",
  "linear-gradient(135deg, #059669, #10B981)",
  "linear-gradient(135deg, #D97706, #F59E0B)",
  "linear-gradient(135deg, #DC2626, #F87171)",
  "linear-gradient(135deg, #7C3AED, #C084FC)"
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

// Sanalar formati
function getTodayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${d}-${MONTH_NAMES_UZ[m].toLowerCase()} ${y}`;
}

// ----------------------------------------------------
// 1. O'QUVCHILAR BO'LIMI
// ----------------------------------------------------
let allStudents = [];
let selectedStudentForAction = null;
const studentsListEl = document.getElementById("studentsList");
const studentSearchInput = document.getElementById("studentSearchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const studentsLoaderEl = document.getElementById("studentsLoader");
const sheetStudentActions = document.getElementById("sheetStudentActions");
const modalStudent = document.getElementById("modalStudent");
const formStudent = document.getElementById("formStudent");

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
    emptyCard.className = "empty-card";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon-wrap";
    emptyIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

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
    card.className = "card";

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
    chevron.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    card.appendChild(cardLeft);
    card.appendChild(chevron);

    card.onclick = () => {
      haptic.impact("light");
      openStudentActionSheet(st);
    };

    studentsListEl.appendChild(card);
  });
}

function openStudentActionSheet(st) {
  selectedStudentForAction = st;
  const avatarEl = document.getElementById("sheetStudentAvatar");
  const nameEl = document.getElementById("sheetStudentName");
  const gradeEl = document.getElementById("sheetStudentGrade");

  const studentFullName = `${st.first_name || ""} ${st.last_name || ""}`.trim();

  if (avatarEl) {
    avatarEl.style.background = getAvatarColor(studentFullName);
    avatarEl.textContent = getInitials(st.first_name, st.last_name);
  }
  if (nameEl) nameEl.textContent = studentFullName;
  if (gradeEl) {
    if (st.grade && st.grade.trim() !== "") {
      gradeEl.textContent = `Sinf: ${st.grade.trim()}`;
      gradeEl.classList.remove("hidden");
    } else {
      gradeEl.textContent = "";
      gradeEl.classList.add("hidden");
    }
  }

  sheetStudentActions?.classList.remove("hidden");
  updateBackButton();
}

document.getElementById("btnSheetEditStudent")?.addEventListener("click", () => {
  haptic.impact("light");
  sheetStudentActions?.classList.add("hidden");
  if (selectedStudentForAction) {
    openEditStudentModal(selectedStudentForAction);
  }
});

document.getElementById("btnSheetDeleteStudent")?.addEventListener("click", async () => {
  haptic.impact("medium");
  sheetStudentActions?.classList.add("hidden");
  updateBackButton();

  if (!selectedStudentForAction) return;
  const name = `${selectedStudentForAction.first_name} ${selectedStudentForAction.last_name}`;
  const confirmed = await confirmAction(
    `"${name}" o'quvchisini ro'yxatdan o'chirishni tasdiqlaysizmi?`,
    "O'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/students/${selectedStudentForAction.id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("O'quvchi o'chirildi", "success");
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
    last_name: document.getElementById("studentLastName").value.trim(),
    grade: gradeVal || null
  };

  try {
    if (id) {
      await apiRequest(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("O'quvchi ma'lumotlari yangilandi", "success");
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

// ----------------------------------------------------
// 2. DAVOMAT BO'LIMI VA KALENDAR
// ----------------------------------------------------
let currentAttDate = getTodayString();
let currentAttCalYear = new Date().getFullYear();
let currentAttCalMonth = new Date().getMonth(); // 0..11
let attendanceMonthCache = {}; // dateStr -> { has_present: bool, has_absent: bool }

const attendanceListEl = document.getElementById("attendanceList");
const attendanceLoaderEl = document.getElementById("attendanceLoader");
const attCalMonthTitleEl = document.getElementById("attCalMonthTitle");
const attCalendarGridEl = document.getElementById("attCalendarGrid");
const attSelectedDateTitleEl = document.getElementById("attSelectedDateTitle");
const attSummaryStatEl = document.getElementById("attSummaryStat");

function renderAttendanceCalendar() {
  if (!attCalendarGridEl) return;
  attCalendarGridEl.replaceChildren();

  if (attCalMonthTitleEl) {
    attCalMonthTitleEl.textContent = `${MONTH_NAMES_UZ[currentAttCalMonth]} ${currentAttCalYear}`;
  }

  const firstDay = new Date(currentAttCalYear, currentAttCalMonth, 1).getDay();
  // Haftani dushanbadan boshlash (0: Yakshanba -> 6, 1: Dushanba -> 0)
  const startingDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentAttCalYear, currentAttCalMonth + 1, 0).getDate();

  // Bo'sh boshlang'ich kataklar
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

    // Nuqta ko'rsatish
    const cachedInfo = attendanceMonthCache[fullDate];
    if (cachedInfo) {
      const dot = document.createElement("span");
      dot.className = "cal-day-dot";
      if (cachedInfo.has_absent) {
        dot.classList.add("dot-red");
      } else if (cachedInfo.has_present) {
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

let currentAttendanceItems = [];

async function loadAttendance() {
  attendanceLoaderEl?.classList.remove("hidden");
  if (attSelectedDateTitleEl) {
    attSelectedDateTitleEl.textContent = formatDisplayDate(currentAttDate);
  }

  try {
    currentAttendanceItems = await apiRequest(`/api/attendance?date=${currentAttDate}`);
    renderAttendanceList();
  } catch (e) {
    console.error("Davomatni yuklashda xato:", e);
  } finally {
    attendanceLoaderEl?.classList.add("hidden");
  }
}

function renderAttendanceList() {
  attendanceListEl.replaceChildren();

  let presentCount = 0;
  let absentCount = 0;

  if (currentAttendanceItems) {
    currentAttendanceItems.forEach((it) => {
      if (it.status === "present") presentCount++;
      if (it.status === "absent") absentCount++;
    });
  }

  const total = currentAttendanceItems ? currentAttendanceItems.length : 0;
  if (attSummaryStatEl) {
    attSummaryStatEl.textContent = `Keldi: ${presentCount} / ${total}`;
  }

  // Kalendar uchun nuqtani yangilash
  if (presentCount > 0 || absentCount > 0) {
    attendanceMonthCache[currentAttDate] = {
      has_present: presentCount > 0,
      has_absent: absentCount > 0
    };
    renderAttendanceCalendar();
  }

  if (!currentAttendanceItems || currentAttendanceItems.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-card";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon-wrap";
    emptyIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`;

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";

    emptyCard.appendChild(emptyIcon);
    emptyCard.appendChild(emptyTitle);
    attendanceListEl.appendChild(emptyCard);
    return;
  }

  currentAttendanceItems.forEach((it) => {
    const card = document.createElement("div");
    card.className = "card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";

    const studentFullName = `${it.first_name || ""} ${it.last_name || ""}`.trim();

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = getAvatarColor(studentFullName);
    avatar.textContent = getInitials(it.first_name, it.last_name);

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = studentFullName;

    info.appendChild(title);

    if (it.grade && it.grade.trim() !== "") {
      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = `Sinf: ${it.grade.trim()}`;
      info.appendChild(subtitle);
    }

    cardLeft.appendChild(avatar);
    cardLeft.appendChild(info);

    // Katta holat tugmasi (Neytral -> Keldi -> Kelmadi -> Neytral)
    const btnToggle = document.createElement("button");
    btnToggle.className = "btn-attendance-toggle";

    if (it.status === "present") {
      btnToggle.classList.add("state-present");
      btnToggle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Keldi</span>`;
    } else if (it.status === "absent") {
      btnToggle.classList.add("state-absent");
      btnToggle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span>Kelmadi</span>`;
    } else {
      btnToggle.textContent = "-";
    }

    btnToggle.onclick = (e) => {
      e.stopPropagation();
      let nextStatus = null;
      if (!it.status) {
        nextStatus = "present";
        haptic.impact("light");
      } else if (it.status === "present") {
        nextStatus = "absent";
        haptic.impact("medium");
      } else {
        nextStatus = null;
        haptic.impact("light");
      }

      // Optimistik UI yangilanish
      it.status = nextStatus;
      renderAttendanceList();

      // Backendga saqlash
      updateAttendanceRecord(it.student_id, currentAttDate, nextStatus);
    };

    card.appendChild(cardLeft);
    card.appendChild(btnToggle);
    attendanceListEl.appendChild(card);
  });
}

async function updateAttendanceRecord(studentId, dateStr, status) {
  try {
    await apiRequest("/api/attendance", {
      method: "PUT",
      body: JSON.stringify({ student_id: studentId, date: dateStr, status: status })
    });
  } catch (err) {
    loadAttendance(); // Xatolik bo'lsa qayta yuklash
  }
}

// ----------------------------------------------------
// 3. BAHOLASH BO'LIMI
// ----------------------------------------------------
let currentGradeDate = getTodayString();
let currentGradeCalYear = new Date().getFullYear();
let currentGradeCalMonth = new Date().getMonth();
let gradesMonthCache = {}; // dateStr -> bool (has_grades)

const gradesListEl = document.getElementById("gradesList");
const gradesLoaderEl = document.getElementById("gradesLoader");
const gradeCalMonthTitleEl = document.getElementById("gradeCalMonthTitle");
const gradeCalendarGridEl = document.getElementById("gradeCalendarGrid");
const gradeSelectedDateTitleEl = document.getElementById("gradeSelectedDateTitle");
const gradeSummaryStatEl = document.getElementById("gradeSummaryStat");
const sheetGradeSelector = document.getElementById("sheetGradeSelector");
const wrapGradeDeleteBtn = document.getElementById("wrapGradeDeleteBtn");

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

let currentGrades = [];
let selectedStudentForGrade = null;
let selectedGradeRecord = null;

async function loadGrades() {
  gradesLoaderEl?.classList.remove("hidden");
  if (gradeSelectedDateTitleEl) {
    gradeSelectedDateTitleEl.textContent = formatDisplayDate(currentGradeDate);
  }

  try {
    currentGrades = await apiRequest(`/api/grades?date=${currentGradeDate}`);
    if (!allStudents || allStudents.length === 0) {
      allStudents = await apiRequest("/api/students");
    }
    renderGradesList();
  } catch (e) {
    console.error("Baholarni yuklashda xato:", e);
  } finally {
    gradesLoaderEl?.classList.add("hidden");
  }
}

function renderGradesList() {
  gradesListEl.replaceChildren();

  const totalGraded = currentGrades ? currentGrades.length : 0;
  if (gradeSummaryStatEl) {
    gradeSummaryStatEl.textContent = `Baholangan: ${totalGraded}`;
  }

  if (totalGraded > 0) {
    gradesMonthCache[currentGradeDate] = true;
    renderGradesCalendar();
  }

  if (!allStudents || allStudents.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-card";
    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";
    emptyCard.appendChild(emptyTitle);
    gradesListEl.appendChild(emptyCard);
    return;
  }

  allStudents.forEach((st) => {
    const card = document.createElement("div");
    card.className = "card";

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

    // Shu kundagi o'quvchining bahosini topish
    const gradeObj = currentGrades.find((g) => g.student_id === st.id);

    const gradeChip = document.createElement("div");
    gradeChip.className = "grade-chip";

    if (gradeObj) {
      gradeChip.textContent = String(gradeObj.value);
      gradeChip.classList.add("has-grade");
      if (gradeObj.value === 5) {
        gradeChip.classList.add("grade-5");
      }
    } else {
      gradeChip.textContent = "-";
    }

    card.appendChild(cardLeft);
    card.appendChild(gradeChip);

    card.onclick = () => {
      haptic.impact("light");
      openGradeBottomSheet(st, gradeObj);
    };

    gradesListEl.appendChild(card);
  });
}

function openGradeBottomSheet(student, gradeObj) {
  selectedStudentForGrade = student;
  selectedGradeRecord = gradeObj || null;

  const titleEl = document.getElementById("sheetGradeStudentName");
  if (titleEl) {
    titleEl.textContent = `${student.first_name || ""} ${student.last_name || ""}`.trim();
  }

  // 1-5 tugmalarni yangilash
  const currentVal = gradeObj ? gradeObj.value : null;
  document.querySelectorAll(".btn-grade-round").forEach((btn) => {
    const val = parseInt(btn.getAttribute("data-val"), 10);
    if (val === currentVal) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // O'chirish tugmasi ko'rinishi
  if (wrapGradeDeleteBtn) {
    if (gradeObj) {
      wrapGradeDeleteBtn.classList.remove("hidden");
    } else {
      wrapGradeDeleteBtn.classList.add("hidden");
    }
  }

  sheetGradeSelector?.classList.remove("hidden");
  updateBackButton();
}

// Baho tugmalarini bosish
document.querySelectorAll(".btn-grade-round").forEach((btn) => {
  btn.onclick = async () => {
    const val = parseInt(btn.getAttribute("data-val"), 10);
    haptic.impact("medium");

    sheetGradeSelector?.classList.add("hidden");
    updateBackButton();

    if (!selectedStudentForGrade) return;

    try {
      if (selectedGradeRecord) {
        // Yangilash
        await apiRequest(`/api/grades/${selectedGradeRecord.id}`, {
          method: "PUT",
          body: JSON.stringify({ value: val })
        });
      } else {
        // Yangi qo'yish
        await apiRequest("/api/grades", {
          method: "POST",
          body: JSON.stringify({
            student_id: selectedStudentForGrade.id,
            date: currentGradeDate,
            value: val
          })
        });
      }
      haptic.notification("success");
      loadGrades();
    } catch (err) {}
  };
});

// Bahoni o'chirish
document.getElementById("btnGradeDelete")?.addEventListener("click", async () => {
  haptic.impact("medium");
  sheetGradeSelector?.classList.add("hidden");
  updateBackButton();

  if (!selectedGradeRecord) return;
  const confirmed = await confirmAction(
    "Ushbu bahoni o'chirishni tasdiqlaysizmi?",
    "O'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/grades/${selectedGradeRecord.id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("Baho o'chirildi", "success");
      loadGrades();
    } catch (err) {}
  }
});

// ----------------------------------------------------
// 4. MANBALAR BO'LIMI
// ----------------------------------------------------
let allSources = [];
let selectedSourceForAction = null;
const sourcesListEl = document.getElementById("sourcesList");
const sourcesLoaderEl = document.getElementById("sourcesLoader");
const sheetSourceActions = document.getElementById("sheetSourceActions");
const modalSource = document.getElementById("modalSource");
const formSource = document.getElementById("formSource");

async function loadSources() {
  sourcesLoaderEl?.classList.remove("hidden");
  try {
    allSources = await apiRequest("/api/sources");
    renderSources();
  } catch (e) {
    console.error("Manbalarni yuklashda xato:", e);
  } finally {
    sourcesLoaderEl?.classList.add("hidden");
  }
}

function renderSources() {
  sourcesListEl.replaceChildren();

  if (!allSources || allSources.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-card";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon-wrap";
    emptyIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "Manbalar mavjud emas";

    emptyCard.appendChild(emptyIcon);
    emptyCard.appendChild(emptyTitle);
    sourcesListEl.appendChild(emptyCard);
    return;
  }

  allSources.forEach((src) => {
    const card = document.createElement("div");
    card.className = "card";

    const cardLeft = document.createElement("div");
    cardLeft.className = "card-left";

    const iconWrap = document.createElement("div");
    iconWrap.className = "source-icon-wrap";
    iconWrap.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = src.title_uz;

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = src.text_uz;

    info.appendChild(title);
    info.appendChild(subtitle);

    cardLeft.appendChild(iconWrap);
    cardLeft.appendChild(info);

    const chevron = document.createElement("div");
    chevron.className = "card-chevron";
    chevron.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    card.appendChild(cardLeft);
    card.appendChild(chevron);

    card.onclick = () => {
      haptic.impact("light");
      openSourceActionSheet(src);
    };

    sourcesListEl.appendChild(card);
  });
}

function openSourceActionSheet(src) {
  selectedSourceForAction = src;
  const titleEl = document.getElementById("sheetSourceTitle");
  if (titleEl) titleEl.textContent = src.title_uz;

  sheetSourceActions?.classList.remove("hidden");
  updateBackButton();
}

document.getElementById("btnSheetEditSource")?.addEventListener("click", () => {
  haptic.impact("light");
  sheetSourceActions?.classList.add("hidden");
  if (selectedSourceForAction) {
    openEditSourceModal(selectedSourceForAction);
  }
});

document.getElementById("btnSheetDeleteSource")?.addEventListener("click", async () => {
  haptic.impact("medium");
  sheetSourceActions?.classList.add("hidden");
  updateBackButton();

  if (!selectedSourceForAction) return;
  const confirmed = await confirmAction(
    `"${selectedSourceForAction.title_uz}" manbasini o'chirishni tasdiqlaysizmi?`,
    "O'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/sources/${selectedSourceForAction.id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("Manba o'chirildi", "success");
      loadSources();
    } catch (err) {}
  }
});

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

// Tahrirlashdagi UZ | EN | RU tablari
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
      loadSources();
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
      loadSources();
    } catch (err) {
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  }
});

// Dastlabki yuklanish
updateFabVisibility();
loadStudents();
