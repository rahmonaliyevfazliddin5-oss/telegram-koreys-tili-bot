export function formatName(lastName, firstName) {
  const ln = (lastName || "").trim();
  const fn = (firstName || "").trim();
  if (ln && fn) {
    return `${ln} ${fn}`;
  }
  return fn || ln || "";
}

export function formatStudentName(student) {
  if (!student) return "";
  return formatName(student.last_name, student.first_name);
}

export function formatMoney(amount) {
  const num = Math.round(Number(amount) || 0);
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} so'm`;
}

export function formatLate(minutes) {
  const m = Number(minutes);
  if (!m || m <= 0) return "";
  if (m < 60) {
    return `+${m} daqiqa kech qoldi`;
  }
  const hours = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) {
    return `+${hours} soat kech qoldi`;
  }
  return `+${hours} soat ${rem} daqiqa kech qoldi`;
}

export function formatLateCompact(minutes) {
  const m = Number(minutes);
  if (!m || m <= 0) return "";
  if (m < 60) return `+${m} daq`;
  const hours = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `+${hours} soat`;
  return `+${hours}s ${rem}m`;
}

export const WEEKDAYS_SHORT = ["Du", "Se", "Chor", "Pay", "Ju"];
export const WEEKDAYS_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

export const MONTH_NAMES_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

export function getInitials(lastName, firstName) {
  const l = (lastName || "").trim();
  const f = (firstName || "").trim();
  if (l && f) return `${l[0]}${f[0]}`.toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  if (l) return l.slice(0, 2).toUpperCase();
  return "?";
}

const AVATAR_COLORS = [
  "#E4002B", "#F59E0B", "#16A34A", "#2563EB", 
  "#7C3AED", "#DB2777", "#0D9488", "#EA580C"
];

export function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
