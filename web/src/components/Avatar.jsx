import { getInitials, getAvatarColor } from "../lib/format.js";

export function Avatar({ lastName, firstName, size = 36, onClick, className = "" }) {
  const initials = getInitials(lastName, firstName);
  const bgColor = getAvatarColor(`${lastName} ${firstName}`);

  const style = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: "9999px",
    backgroundColor: bgColor,
    color: "#FFFFFF",
    fontSize: size <= 36 ? "13px" : "15px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: onClick ? "pointer" : "default"
  };

  return (
    <div
      class={`avatar-circle ${className}`}
      style={style}
      onClick={onClick}
      aria-label={`${lastName || ""} ${firstName || ""}`}
    >
      {initials}
    </div>
  );
}
