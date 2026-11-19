const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// X tugmasi bosilganda Mini App'ni yopish
document.getElementById("btnClose").addEventListener("click", () => {
  if (tg) {
    tg.close();
  }
});
document.getElementById("btnUnauthorizedClose").addEventListener("click", () => {
  if (tg) {
    tg.close();
  }
});

// Telegram initData
const initData = tg?.initData || "";

// Xavfsiz API so'rov yuborish
async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Authorization": `tma ${initData}`,
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
      alert(err.message);
    }
    throw err;
  }
}

function showUnauthorized() {
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("bottomNav").classList.add("hidden");
  document.getElementById("unauthorizedView").classList.remove("hidden");
}

// Tablarni almashtirish
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");

navItems.forEach(item => {
  item.addEventListener("click", () => {
    navItems.forEach(n => n.classList.remove("active"));
    tabContents.forEach(t => t.classList.remove("active"));

    item.classList.add("active");
    const tabId = item.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");

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

// ----------------------------------------------------
// 1. O'QUVCHILAR
// ----------------------------------------------------
let allStudents = [];
const studentsListEl = document.getElementById("studentsList");
const studentSearchInput = document.getElementById("studentSearchInput");

async function loadStudents() {
  const query = studentSearchInput.value.trim();
  const endpoint = query ? `/api/students?search=${encodeURIComponent(query)}` : "/api/students";
  allStudents = await apiRequest(endpoint);
  renderStudents();
}

studentSearchInput.addEventListener("input", () => {
  loadStudents();
});

function renderStudents() {
  studentsListEl.replaceChildren();

  if (!allStudents || allStudents.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "card-subtitle";
    emptyEl.textContent = "O'quvchilar mavjud emas";
    studentsListEl.appendChild(emptyEl);
    return;
  }

  allStudents.forEach(st => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = `${st.first_name} ${st.last_name}`;

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `Sinf: ${st.grade}`;

    info.appendChild(title);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-primary btn-sm";
    btnEdit.textContent = "Tahrirlash";
    btnEdit.onclick = () => openEditStudentModal(st);

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-sm";
    btnDel.textContent = "O'chirish";
    btnDel.onclick = () => deleteStudent(st.id);

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
  document.getElementById("modalStudentTitle").textContent = "O'quvchi qo'shish";
  document.getElementById("studentId").value = "";
  document.getElementById("studentFirstName").value = "";
  document.getElementById("studentLastName").value = "";
  document.getElementById("studentGrade").value = "";
  modalStudent.classList.remove("hidden");
};

document.getElementById("btnCloseStudentModal").onclick = () => {
  modalStudent.classList.add("hidden");
};

function openEditStudentModal(st) {
  document.getElementById("modalStudentTitle").textContent = "O'quvchini tahrirlash";
  document.getElementById("studentId").value = st.id;
  document.getElementById("studentFirstName").value = st.first_name;
  document.getElementById("studentLastName").value = st.last_name;
  document.getElementById("studentGrade").value = st.grade;
  modalStudent.classList.remove("hidden");
}

formStudent.onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById("studentId").value;
  const payload = {
    first_name: document.getElementById("studentFirstName").value.trim(),
    last_name: document.getElementById("studentLastName").value.trim(),
    grade: document.getElementById("studentGrade").value.trim()
  };

  if (id) {
    await apiRequest(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  } else {
    await apiRequest("/api/students", { method: "POST", body: JSON.stringify(payload) });
  }

  modalStudent.classList.add("hidden");
  loadStudents();
};

async function deleteStudent(id) {
  if (confirm("Haqiqatan ham bu o'quvchini o'chirmoqchimisiz?")) {
    await apiRequest(`/api/students/${id}`, { method: "DELETE" });
    loadStudents();
  }
}

// ----------------------------------------------------
// 2. DAVOMAT
// ----------------------------------------------------
const attendanceDateInput = document.getElementById("attendanceDate");
const attendanceListEl = document.getElementById("attendanceList");
attendanceDateInput.value = getTodayString();

attendanceDateInput.onchange = () => {
  loadAttendance();
};

async function loadAttendance() {
  const dt = attendanceDateInput.value || getTodayString();
  const items = await apiRequest(`/api/attendance?date=${dt}`);
  renderAttendance(items, dt);
}

function renderAttendance(items, dt) {
  attendanceListEl.replaceChildren();

  if (!items || items.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "card-subtitle";
    emptyEl.textContent = "O'quvchilar topilmadi";
    attendanceListEl.appendChild(emptyEl);
    return;
  }

  items.forEach(it => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = `${it.first_name} ${it.last_name}`;

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `Sinf: ${it.grade}`;

    info.appendChild(title);
    info.appendChild(subtitle);

    const toggle = document.createElement("div");
    toggle.className = "attendance-toggle";

    const btnPresent = document.createElement("button");
    btnPresent.className = `btn-status present ${it.status === "present" ? "active" : ""}`;
    btnPresent.textContent = "Keldi (+)";
    btnPresent.onclick = () => updateAttendanceStatus(it.student_id, dt, it.status === "present" ? null : "present");

    const btnAbsent = document.createElement("button");
    btnAbsent.className = `btn-status absent ${it.status === "absent" ? "active" : ""}`;
    btnAbsent.textContent = "Kelmadi (-)";
    btnAbsent.onclick = () => updateAttendanceStatus(it.student_id, dt, it.status === "absent" ? null : "absent");

    toggle.appendChild(btnPresent);
    toggle.appendChild(btnAbsent);

    card.appendChild(info);
    card.appendChild(toggle);
    attendanceListEl.appendChild(card);
  });
}

async function updateAttendanceStatus(studentId, dt, status) {
  await apiRequest("/api/attendance", {
    method: "PUT",
    body: JSON.stringify({ student_id: studentId, date: dt, status: status })
  });
  loadAttendance();
}

// ----------------------------------------------------
// 3. BAHOLASH
// ----------------------------------------------------
const gradeDateInput = document.getElementById("gradeDate");
const gradesListEl = document.getElementById("gradesList");
gradeDateInput.value = getTodayString();

gradeDateInput.onchange = () => {
  loadGrades();
};

async function loadGrades() {
  const dt = gradeDateInput.value || getTodayString();
  const grades = await apiRequest(`/api/grades?date=${dt}`);
  renderGrades(grades);
}

function renderGrades(grades) {
  gradesListEl.replaceChildren();

  if (!grades || grades.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "card-subtitle";
    emptyEl.textContent = "Tanlangan sanada baholar mavjud emas";
    gradesListEl.appendChild(emptyEl);
    return;
  }

  grades.forEach(gr => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = gr.student_name || "O'quvchi";

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `Baho: ${gr.value}`;

    info.appendChild(title);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-primary btn-sm";
    btnEdit.textContent = "Tahrirlash";
    btnEdit.onclick = () => openEditGradeModal(gr);

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-sm";
    btnDel.textContent = "O'chirish";
    btnDel.onclick = () => deleteGrade(gr.id);

    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    card.appendChild(info);
    card.appendChild(actions);
    gradesListEl.appendChild(card);
  });
}

const modalGrade = document.getElementById("modalGrade");
const formGrade = document.getElementById("formGrade");
const gradeStudentSelect = document.getElementById("gradeStudentSelect");
const gradeButtons = document.querySelectorAll(".btn-grade");

gradeButtons.forEach(btn => {
  btn.onclick = () => {
    gradeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("gradeValue").value = btn.getAttribute("data-val");
  };
});

document.getElementById("btnOpenAddGrade").onclick = async () => {
  document.getElementById("modalGradeTitle").textContent = "Baho qo'yish";
  document.getElementById("gradeId").value = "";
  document.getElementById("gradeStudentSelectGroup").classList.remove("hidden");

  // O'quvchilar ro'yxatini yuklash
  const students = await apiRequest("/api/students");
  gradeStudentSelect.replaceChildren();
  students.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = `${st.first_name} ${st.last_name} (${st.grade})`;
    gradeStudentSelect.appendChild(opt);
  });

  modalGrade.classList.remove("hidden");
};

document.getElementById("btnCloseGradeModal").onclick = () => {
  modalGrade.classList.add("hidden");
};

function openEditGradeModal(gr) {
  document.getElementById("modalGradeTitle").textContent = "Bahoni tahrirlash";
  document.getElementById("gradeId").value = gr.id;
  document.getElementById("gradeStudentSelectGroup").classList.add("hidden");

  gradeButtons.forEach(b => {
    if (b.getAttribute("data-val") === String(gr.value)) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
  document.getElementById("gradeValue").value = gr.value;

  modalGrade.classList.remove("hidden");
}

formGrade.onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById("gradeId").value;
  const val = parseInt(document.getElementById("gradeValue").value, 10);
  const dt = gradeDateInput.value || getTodayString();

  if (id) {
    await apiRequest(`/api/grades/${id}`, { method: "PUT", body: JSON.stringify({ value: val }) });
  } else {
    const studentId = parseInt(gradeStudentSelect.value, 10);
    await apiRequest("/api/grades", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, date: dt, value: val })
    });
  }

  modalGrade.classList.add("hidden");
  loadGrades();
};

async function deleteGrade(id) {
  if (confirm("Haqiqatan ham ushbu bahoni o'chirmoqchimisiz?")) {
    await apiRequest(`/api/grades/${id}`, { method: "DELETE" });
    loadGrades();
  }
}

// ----------------------------------------------------
// 4. MANBALAR
// ----------------------------------------------------
const sourcesListEl = document.getElementById("sourcesList");
let allSources = [];

async function loadSources() {
  allSources = await apiRequest("/api/sources");
  renderSources();
}

function renderSources() {
  sourcesListEl.replaceChildren();

  if (!allSources || allSources.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "card-subtitle";
    emptyEl.textContent = "Manbalar mavjud emas";
    sourcesListEl.appendChild(emptyEl);
    return;
  }

  allSources.forEach(src => {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = src.title_uz;

    const subtitle = document.createElement("div");
    subtitle.className = "card-subtitle";
    subtitle.textContent = src.text_uz.length > 50 ? src.text_uz.substring(0, 50) + "..." : src.text_uz;

    info.appendChild(title);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-primary btn-sm";
    btnEdit.textContent = "Tahrirlash";
    btnEdit.onclick = () => openEditSourceModal(src);

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-sm";
    btnDel.textContent = "O'chirish";
    btnDel.onclick = () => deleteSource(src.id);

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
  document.getElementById("modalSourceTitle").textContent = "Manba qo'shish";
  document.getElementById("sourceId").value = "";
  document.getElementById("sourceAddFields").classList.remove("hidden");
  document.getElementById("sourceEditFields").classList.add("hidden");
  document.getElementById("sourceTitle").value = "";
  document.getElementById("sourceText").value = "";
  document.getElementById("btnSaveSource").textContent = "Saqlash";
  modalSource.classList.remove("hidden");
};

document.getElementById("btnCloseSourceModal").onclick = () => {
  modalSource.classList.add("hidden");
};

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
  document.getElementById("btnSaveSource").textContent = "Saqlash";

  modalSource.classList.remove("hidden");
}

formSource.onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById("sourceId").value;
  const btnSave = document.getElementById("btnSaveSource");

  if (id) {
    const payload = {
      title_uz: document.getElementById("sourceTitleUz").value.trim(),
      text_uz: document.getElementById("sourceTextUz").value.trim(),
      title_en: document.getElementById("sourceTitleEn").value.trim(),
      text_en: document.getElementById("sourceTextEn").value.trim(),
      title_ru: document.getElementById("sourceTitleRu").value.trim(),
      text_ru: document.getElementById("sourceTextRu").value.trim(),
      position: 0
    };
    await apiRequest(`/api/sources/${id}`, { method: "PUT", body: JSON.stringify(payload) });
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
    } finally {
      btnSave.textContent = "Saqlash";
      btnSave.disabled = false;
    }
  }

  modalSource.classList.add("hidden");
  loadSources();
};

async function deleteSource(id) {
  if (confirm("Haqiqatan ham bu manbani o'chirmoqchimisiz?")) {
    await apiRequest(`/api/sources/${id}`, { method: "DELETE" });
    loadSources();
  }
}

// Dastlabki yuklanish
loadStudents();
