// Public / Parent Portal API client (No admin authentication required)
export async function fetchPortalLeaderboard() {
  const res = await fetch("/api/portal/leaderboard");
  if (!res.ok) throw new Error("Reyting ma'lumotlarini yuklashda xatolik");
  return await res.json();
}

export async function fetchPortalAttendance(dateStr = null) {
  const url = dateStr ? `/api/portal/attendance?target_date=${dateStr}` : "/api/portal/attendance";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Davomat ma'lumotlarini yuklashda xatolik");
  return await res.json();
}

export async function fetchPortalStudents(query = "", grade = "") {
  const params = new URLSearchParams();
  if (query) params.append("q", query);
  if (grade) params.append("grade", grade);
  const qStr = params.toString();
  const res = await fetch(`/api/portal/students${qStr ? `?${qStr}` : ""}`);
  if (!res.ok) throw new Error("O'quvchilar ro'yxatini yuklashda xatolik");
  return await res.json();
}

export async function fetchPortalStudentDetail(studentId) {
  const res = await fetch(`/api/portal/students/${studentId}`);
  if (!res.ok) throw new Error("O'quvchi ma'lumotlarini yuklashda xatolik");
  return await res.json();
}

export async function fetchPortalTeacher() {
  const res = await fetch("/api/portal/teacher");
  if (!res.ok) throw new Error("O'qituvchi ma'lumotlarini yuklashda xatolik");
  return await res.json();
}
