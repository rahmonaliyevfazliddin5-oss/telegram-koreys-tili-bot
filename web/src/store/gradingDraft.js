let drafts = {};
let originalStates = {};
const listeners = new Set();

export function setOriginalGrades(items) {
  drafts = {};
  originalStates = {};
  for (const item of items) {
    const sId = item.student_id;
    originalStates[sId] = {
      status: item.status || "absent",
      value: item.value ?? null,
      late_minutes: item.late_minutes ?? null
    };
    drafts[sId] = { ...originalStates[sId] };
  }
  notify();
}

export function updateStudentGrade(studentId, { status, value, late_minutes }) {
  if (!drafts[studentId]) {
    drafts[studentId] = { status: "absent", value: null, late_minutes: null };
  }
  if (status !== undefined) drafts[studentId].status = status;
  if (value !== undefined) drafts[studentId].value = value;
  if (late_minutes !== undefined) drafts[studentId].late_minutes = late_minutes;
  notify();
}

export function getStudentDraft(studentId) {
  return drafts[studentId] || { status: "absent", value: null, late_minutes: null };
}

export function getAllDrafts() {
  return drafts;
}

export function hasUnsavedChanges() {
  for (const sId of Object.keys(drafts)) {
    const d = drafts[sId];
    const o = originalStates[sId] || { status: "absent", value: null, late_minutes: null };
    if (d.status !== o.status || d.value !== o.value || d.late_minutes !== o.late_minutes) {
      return true;
    }
  }
  return false;
}

export function subscribeDrafts(cb) {
  listeners.add(cb);
  cb(drafts);
  return () => listeners.delete(cb);
}

function notify() {
  for (const cb of listeners) {
    try { cb(drafts); } catch (e) { console.error(e); }
  }
}
