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
      tg.setHeaderColor("#151b26");
    }
    if (typeof tg.setBackgroundColor === "function") {
      tg.setBackgroundColor("#0b0e14");
    }
  } catch (e) {
    console.warn("Telegram WebApp sozlamalarini yuklashda xatolik:", e);
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

// Telegram orqaga (BackButton) boshqaruvi
function updateBackButton() {
  if (!tg?.BackButton) return;
  const anyOpenModal = document.querySelector(".modal:not(.hidden)");
  if (anyOpenModal) {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

if (tg?.BackButton) {
  tg.BackButton.onClick(() => {
    closeAllModals();
  });
}

// X tugmasi bosilganda Mini App'ni yopish
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

  // Animatsiyali ko'rsatish
  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 280);
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

// Barcha modallarni yopish
function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => {
    m.classList.add("hidden");
  });
  updateBackButton();
}

// Modal orqa fonini bosganda yopish
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("modal-backdrop") ||
      e.target.classList.contains("sheet-handle")
    ) {
      haptic.impact("light");
      closeAllModals();
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
  document.getElementById("unauthorizedView")?.classList.remove("hidden");
}

// Tablarni almashtirish
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    haptic.selection();

    navItems.forEach((n) => n.classList.remove("active"));
    tabContents.forEach((t) => t.classList.remove("active"));

    item.classList.add("active");
    const tabId = item.getAttribute("data-tab");
    document.getElementById(tabId)?.classList.add("active");

    if (tabId === "tabStudents") loadStudents();
    if (tabId === "tabAttendance") loadAttendance();
    if (tabId === "tabGrades") loadGrades();
    if (tabId === "tabSources") loadSources();
  });
});

// Bugungi sanani formatlash (YYYY-MM-DD)
function getTodayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Sanani siljitish (kunlar bo'yicha)
function shiftDateString(dateStr, days) {
  if (!dateStr) dateStr = getTodayString();
  const parts = dateStr.split("-");
  const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ----------------------------------------------------
// 1. O'QUVCHILAR BO'LIMI
// ----------------------------------------------------
let allStudents = [];
const studentsListEl = document.getElementById("studentsList");
const studentSearchInput = document.getElementById("studentSearchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const studentsCountEl = document.getElementById("studentsCount");
const studentsLoaderEl = document.getElementById("studentsLoader");

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

studentSearchInput.addEventListener("input", () => {
  if (studentSearchInput.value.length > 0) {
    btnClearSearch?.classList.remove("hidden");
  } else {
    btnClearSearch?.classList.add("hidden");
  }

  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadStudents();
  }, 260);
});

btnClearSearch?.addEventListener("click", () => {
  haptic.impact("light");
  studentSearchInput.value = "";
  btnClearSearch.classList.add("hidden");
  loadStudents();
});

function renderStudents() {
  studentsListEl.replaceChildren();

  const total = allStudents ? allStudents.length : 0;
  if (studentsCountEl) {
    studentsCountEl.textContent = `Jami: ${total} ta o'quvchi`;
  }

  if (!allStudents || allStudents.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-card";

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";

    emptyCard.appendChild(emptyTitle);
    studentsListEl.appendChild(emptyCard);
    return;
  }

  allStudents.forEach((st) => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    info.className = "card-info";

    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = `${st.first_name} ${st.last_name}`;

    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = st.grade;

    titleRow.appendChild(title);
    titleRow.appendChild(badge);

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `ID: #${st.id}`;

    info.appendChild(titleRow);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-sm";
    btnEdit.textContent = "Tahrirlash";
    btnEdit.onclick = () => {
      haptic.impact("light");
      openEditStudentModal(st);
    };

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-sm";
    btnDel.textContent = "O'chirish";
    btnDel.onclick = () => {
      deleteStudent(st.id, `${st.first_name} ${st.last_name}`);
    };

    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    card.appendChild(info);
    card.appendChild(actions);
    studentsListEl.appendChild(card);
  });
}

const modalStudent = document.getElementById("modalStudent");
const formStudent = document.getElementById("formStudent");

document.getElementById("btnOpenAddStudent").onclick = () => {
  haptic.impact("light");
  document.getElementById("modalStudentTitle").textContent = "O'quvchi qo'shish";
  document.getElementById("studentId").value = "";
  document.getElementById("studentFirstName").value = "";
  document.getElementById("studentLastName").value = "";
  document.getElementById("studentGrade").value = "";
  modalStudent.classList.remove("hidden");
  updateBackButton();
};

document.getElementById("btnCloseStudentModal").onclick = () => {
  haptic.impact("light");
  modalStudent.classList.add("hidden");
  updateBackButton();
};

function openEditStudentModal(st) {
  document.getElementById("modalStudentTitle").textContent = "O'quvchini tahrirlash";
  document.getElementById("studentId").value = st.id;
  document.getElementById("studentFirstName").value = st.first_name;
  document.getElementById("studentLastName").value = st.last_name;
  document.getElementById("studentGrade").value = st.grade;
  modalStudent.classList.remove("hidden");
  updateBackButton();
}

formStudent.onsubmit = async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const saveBtn = document.getElementById("btnSaveStudent");
  const origText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saqlanmoqda...";

  const id = document.getElementById("studentId").value;
  const payload = {
    first_name: document.getElementById("studentFirstName").value.trim(),
    last_name: document.getElementById("studentLastName").value.trim(),
    grade: document.getElementById("studentGrade").value.trim()
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
    modalStudent.classList.add("hidden");
    updateBackButton();
    loadStudents();
  } catch (err) {
    // Xatolik apiRequest ichida toast ko'rsatiladi
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = origText;
  }
};

async function deleteStudent(id, name) {
  const confirmed = await confirmAction(
    `"${name}" o'quvchisini ro'yxatdan o'chirishni tasdiqlaysizmi?`,
    "O'quvchini o'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/students/${id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("O'quvchi o'chirildi", "success");
      loadStudents();
    } catch (err) {}
  }
}

// ----------------------------------------------------
// 2. DAVOMAT BO'LIMI
// ----------------------------------------------------
const attendanceDateInput = document.getElementById("attendanceDate");
const attendanceListEl = document.getElementById("attendanceList");
const attendanceLoaderEl = document.getElementById("attendanceLoader");
const attTotalEl = document.getElementById("attTotal");
const attPresentEl = document.getElementById("attPresent");
const attAbsentEl = document.getElementById("attAbsent");

const btnAttendancePrev = document.getElementById("btnAttendancePrev");
const btnAttendanceNext = document.getElementById("btnAttendanceNext");
const btnAttendanceToday = document.getElementById("btnAttendanceToday");

attendanceDateInput.value = getTodayString();

attendanceDateInput.onchange = () => {
  haptic.selection();
  loadAttendance();
};

btnAttendancePrev?.addEventListener("click", () => {
  haptic.selection();
  attendanceDateInput.value = shiftDateString(attendanceDateInput.value, -1);
  loadAttendance();
});

btnAttendanceNext?.addEventListener("click", () => {
  haptic.selection();
  attendanceDateInput.value = shiftDateString(attendanceDateInput.value, 1);
  loadAttendance();
});

btnAttendanceToday?.addEventListener("click", () => {
  haptic.selection();
  attendanceDateInput.value = getTodayString();
  loadAttendance();
});

async function loadAttendance() {
  attendanceLoaderEl?.classList.remove("hidden");
  const dt = attendanceDateInput.value || getTodayString();
  try {
    const items = await apiRequest(`/api/attendance?date=${dt}`);
    renderAttendance(items, dt);
  } catch (e) {
    console.error("Davomatni yuklashda xato:", e);
  } finally {
    attendanceLoaderEl?.classList.add("hidden");
  }
}

function renderAttendance(items, dt) {
  attendanceListEl.replaceChildren();

  const total = items ? items.length : 0;
  let presentCount = 0;
  let absentCount = 0;

  if (items && items.length > 0) {
    items.forEach((it) => {
      if (it.status === "present") presentCount++;
      if (it.status === "absent") absentCount++;
    });
  }

  if (attTotalEl) attTotalEl.textContent = `Jami: ${total}`;
  if (attPresentEl) attPresentEl.textContent = `Kelgan: ${presentCount}`;
  if (attAbsentEl) attAbsentEl.textContent = `Kelmadi: ${absentCount}`;

  if (!items || items.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-card";

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "O'quvchilar topilmadi";

    emptyCard.appendChild(emptyTitle);
    attendanceListEl.appendChild(emptyCard);
    return;
  }

  items.forEach((it) => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    info.className = "card-info";

    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = `${it.first_name} ${it.last_name}`;

    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = it.grade;

    titleRow.appendChild(title);
    titleRow.appendChild(badge);

    info.appendChild(titleRow);

    const toggle = document.createElement("div");
    toggle.className = "attendance-toggle";

    const btnPresent = document.createElement("button");
    btnPresent.className = `btn-status present ${it.status === "present" ? "active" : ""}`;
    btnPresent.textContent = "Keldi (+)";
    btnPresent.onclick = () => {
      haptic.impact("medium");
      const nextStatus = it.status === "present" ? null : "present";
      updateAttendanceStatus(it.student_id, dt, nextStatus);
    };

    const btnAbsent = document.createElement("button");
    btnAbsent.className = `btn-status absent ${it.status === "absent" ? "active" : ""}`;
    btnAbsent.textContent = "Kelmadi (-)";
    btnAbsent.onclick = () => {
      haptic.impact("medium");
      const nextStatus = it.status === "absent" ? null : "absent";
      updateAttendanceStatus(it.student_id, dt, nextStatus);
    };

    toggle.appendChild(btnPresent);
    toggle.appendChild(btnAbsent);

    card.appendChild(info);
    card.appendChild(toggle);
    attendanceListEl.appendChild(card);
  });
}

async function updateAttendanceStatus(studentId, dt, status) {
  try {
    await apiRequest("/api/attendance", {
      method: "PUT",
      body: JSON.stringify({ student_id: studentId, date: dt, status: status })
    });
    haptic.notification("success");
    loadAttendance();
  } catch (err) {}
}

// ----------------------------------------------------
// 3. BAHOLASH BO'LIMI
// ----------------------------------------------------
const gradeDateInput = document.getElementById("gradeDate");
const gradesListEl = document.getElementById("gradesList");
const gradesLoaderEl = document.getElementById("gradesLoader");
const gradesTotalEl = document.getElementById("gradesTotal");
const gradesAvgEl = document.getElementById("gradesAvg");

const btnGradePrev = document.getElementById("btnGradePrev");
const btnGradeNext = document.getElementById("btnGradeNext");
const btnGradeToday = document.getElementById("btnGradeToday");

gradeDateInput.value = getTodayString();

gradeDateInput.onchange = () => {
  haptic.selection();
  loadGrades();
};

btnGradePrev?.addEventListener("click", () => {
  haptic.selection();
  gradeDateInput.value = shiftDateString(gradeDateInput.value, -1);
  loadGrades();
});

btnGradeNext?.addEventListener("click", () => {
  haptic.selection();
  gradeDateInput.value = shiftDateString(gradeDateInput.value, 1);
  loadGrades();
});

btnGradeToday?.addEventListener("click", () => {
  haptic.selection();
  gradeDateInput.value = getTodayString();
  loadGrades();
});

async function loadGrades() {
  gradesLoaderEl?.classList.remove("hidden");
  const dt = gradeDateInput.value || getTodayString();
  try {
    const grades = await apiRequest(`/api/grades?date=${dt}`);
    renderGrades(grades);
  } catch (e) {
    console.error("Baholarni yuklashda xato:", e);
  } finally {
    gradesLoaderEl?.classList.add("hidden");
  }
}

function renderGrades(grades) {
  gradesListEl.replaceChildren();

  const total = grades ? grades.length : 0;
  let sum = 0;
  if (grades && grades.length > 0) {
    grades.forEach((g) => {
      sum += g.value;
    });
  }

  if (gradesTotalEl) gradesTotalEl.textContent = `Jami baholar: ${total}`;
  if (gradesAvgEl) {
    gradesAvgEl.textContent = total > 0 ? `O'rtacha: ${(sum / total).toFixed(1)}` : "O'rtacha: -";
  }

  if (!grades || grades.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-card";

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "Tanlangan sanada baholar mavjud emas";

    emptyCard.appendChild(emptyTitle);
    gradesListEl.appendChild(emptyCard);
    return;
  }

  grades.forEach((gr) => {
    const card = document.createElement("div");
    card.className = "card";

    const pill = document.createElement("div");
    pill.className = `grade-pill grade-val-${gr.value}`;
    pill.textContent = String(gr.value);

    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = gr.student_name || "O'quvchi";

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `Baho: ${gr.value} ball | Sana: ${gr.date}`;

    info.appendChild(title);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-sm";
    btnEdit.textContent = "Tahrirlash";
    btnEdit.onclick = () => {
      haptic.impact("light");
      openEditGradeModal(gr);
    };

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-sm";
    btnDel.textContent = "O'chirish";
    btnDel.onclick = () => {
      deleteGrade(gr.id, gr.student_name || "O'quvchi");
    };

    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    card.appendChild(pill);
    card.appendChild(info);
    card.appendChild(actions);
    gradesListEl.appendChild(card);
  });
}

const modalGrade = document.getElementById("modalGrade");
const formGrade = document.getElementById("formGrade");
const gradeStudentSelect = document.getElementById("gradeStudentSelect");
const gradeButtons = document.querySelectorAll(".btn-grade");

gradeButtons.forEach((btn) => {
  btn.onclick = () => {
    haptic.selection();
    gradeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("gradeValue").value = btn.getAttribute("data-val");
  };
});

document.getElementById("btnOpenAddGrade").onclick = async () => {
  haptic.impact("light");
  document.getElementById("modalGradeTitle").textContent = "Baho qo'yish";
  document.getElementById("gradeId").value = "";
  document.getElementById("gradeStudentSelectGroup")?.classList.remove("hidden");

  // O'quvchilar ro'yxatini select ga yuklash
  try {
    const students = await apiRequest("/api/students");
    gradeStudentSelect.replaceChildren();

    if (!students || students.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "O'quvchilar topilmadi";
      gradeStudentSelect.appendChild(opt);
    } else {
      students.forEach((st) => {
        const opt = document.createElement("option");
        opt.value = st.id;
        opt.textContent = `${st.first_name} ${st.last_name} (${st.grade})`;
        gradeStudentSelect.appendChild(opt);
      });
    }

    modalGrade.classList.remove("hidden");
    updateBackButton();
  } catch (err) {}
};

document.getElementById("btnCloseGradeModal").onclick = () => {
  haptic.impact("light");
  modalGrade.classList.add("hidden");
  updateBackButton();
};

function openEditGradeModal(gr) {
  document.getElementById("modalGradeTitle").textContent = "Bahoni tahrirlash";
  document.getElementById("gradeId").value = gr.id;
  document.getElementById("gradeStudentSelectGroup")?.classList.add("hidden");

  gradeButtons.forEach((b) => {
    if (b.getAttribute("data-val") === String(gr.value)) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
  document.getElementById("gradeValue").value = gr.value;

  modalGrade.classList.remove("hidden");
  updateBackButton();
}

formGrade.onsubmit = async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const saveBtn = document.getElementById("btnSaveGrade");
  const origText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saqlanmoqda...";

  const id = document.getElementById("gradeId").value;
  const val = parseInt(document.getElementById("gradeValue").value, 10);
  const dt = gradeDateInput.value || getTodayString();

  try {
    if (id) {
      await apiRequest(`/api/grades/${id}`, { method: "PUT", body: JSON.stringify({ value: val }) });
      showToast("Baho yangilandi", "success");
    } else {
      const studentId = parseInt(gradeStudentSelect.value, 10);
      if (!studentId) {
        showToast("Iltimos, o'quvchini tanlang", "warning");
        return;
      }
      await apiRequest("/api/grades", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, date: dt, value: val })
      });
      showToast("Baho qo'yildi", "success");
    }

    haptic.notification("success");
    modalGrade.classList.add("hidden");
    updateBackButton();
    loadGrades();
  } catch (err) {
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = origText;
  }
};

async function deleteGrade(id, studentName) {
  const confirmed = await confirmAction(
    `"${studentName}" uchun bahoni o'chirishni tasdiqlaysizmi?`,
    "Bahoni o'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/grades/${id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("Baho o'chirildi", "success");
      loadGrades();
    } catch (err) {}
  }
}

// ----------------------------------------------------
// 4. MANBALAR BO'LIMI
// ----------------------------------------------------
const sourcesListEl = document.getElementById("sourcesList");
const sourcesLoaderEl = document.getElementById("sourcesLoader");
let allSources = [];

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

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-title";
    emptyTitle.textContent = "Manbalar mavjud emas";

    emptyCard.appendChild(emptyTitle);
    sourcesListEl.appendChild(emptyCard);
    return;
  }

  allSources.forEach((src) => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    info.className = "card-info";

    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = src.title_uz || src.title_en || src.title_ru || "Manba";

    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = "UZ/EN/RU";

    titleRow.appendChild(title);
    titleRow.appendChild(badge);

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    const previewText = src.text_uz || src.text_en || src.text_ru || "";
    subtitle.textContent = previewText.length > 60 ? previewText.substring(0, 60) + "..." : previewText;

    info.appendChild(titleRow);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-sm";
    btnEdit.textContent = "Tahrirlash";
    btnEdit.onclick = () => {
      haptic.impact("light");
      openEditSourceModal(src);
    };

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-sm";
    btnDel.textContent = "O'chirish";
    btnDel.onclick = () => {
      deleteSource(src.id, src.title_uz || "Manba");
    };

    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    card.appendChild(info);
    card.appendChild(actions);
    sourcesListEl.appendChild(card);
  });
}

const modalSource = document.getElementById("modalSource");
const formSource = document.getElementById("formSource");

document.getElementById("btnOpenAddSource").onclick = () => {
  haptic.impact("light");
  document.getElementById("modalSourceTitle").textContent = "Manba qo'shish";
  document.getElementById("sourceId").value = "";
  document.getElementById("sourceAddFields")?.classList.remove("hidden");
  document.getElementById("sourceEditFields")?.classList.add("hidden");
  document.getElementById("sourceTitle").value = "";
  document.getElementById("sourceText").value = "";
  document.getElementById("btnSaveSource").textContent = "Saqlash";
  modalSource.classList.remove("hidden");
  updateBackButton();
};

document.getElementById("btnCloseSourceModal").onclick = () => {
  haptic.impact("light");
  modalSource.classList.add("hidden");
  updateBackButton();
};

function openEditSourceModal(src) {
  document.getElementById("modalSourceTitle").textContent = "Manbani tahrirlash";
  document.getElementById("sourceId").value = src.id;
  document.getElementById("sourceAddFields")?.classList.add("hidden");
  document.getElementById("sourceEditFields")?.classList.remove("hidden");

  document.getElementById("sourceTitleUz").value = src.title_uz || "";
  document.getElementById("sourceTextUz").value = src.text_uz || "";
  document.getElementById("sourceTitleEn").value = src.title_en || "";
  document.getElementById("sourceTextEn").value = src.text_en || "";
  document.getElementById("sourceTitleRu").value = src.title_ru || "";
  document.getElementById("sourceTextRu").value = src.text_ru || "";
  document.getElementById("btnSaveSource").textContent = "Saqlash";

  modalSource.classList.remove("hidden");
  updateBackButton();
}

formSource.onsubmit = async (e) => {
  e.preventDefault();
  haptic.impact("medium");

  const id = document.getElementById("sourceId").value;
  const btnSave = document.getElementById("btnSaveSource");
  const origText = btnSave.textContent;

  if (id) {
    btnSave.textContent = "Saqlanmoqda...";
    btnSave.disabled = true;

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
      modalSource.classList.add("hidden");
      updateBackButton();
      loadSources();
    } catch (err) {
    } finally {
      btnSave.textContent = origText;
      btnSave.disabled = false;
    }
  } else {
    btnSave.textContent = "Tarjima qilinmoqda...";
    btnSave.disabled = true;

    try {
      const payload = {
        title: document.getElementById("sourceTitle").value.trim(),
        text: document.getElementById("sourceText").value.trim(),
        source_lang: document.getElementById("sourceLang").value
      };
      await apiRequest("/api/sources", { method: "POST", body: JSON.stringify(payload) });
      haptic.notification("success");
      showToast("Manba qo'shildi va avtomatik tarjima qilindi", "success");
      modalSource.classList.add("hidden");
      updateBackButton();
      loadSources();
    } catch (err) {
    } finally {
      btnSave.textContent = origText;
      btnSave.disabled = false;
    }
  }
};

async function deleteSource(id, title) {
  const confirmed = await confirmAction(
    `"${title}" manbasini o'chirishni tasdiqlaysizmi?`,
    "Manbani o'chirish"
  );

  if (confirmed) {
    try {
      await apiRequest(`/api/sources/${id}`, { method: "DELETE" });
      haptic.notification("success");
      showToast("Manba o'chirildi", "success");
      loadSources();
    } catch (err) {}
  }
}

// Dastlabki yuklanish
loadStudents();
