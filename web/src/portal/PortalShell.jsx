import { useState } from "preact/hooks";
import { PortalRating } from "./PortalRating.jsx";
import { PortalAttendance } from "./PortalAttendance.jsx";
import { PortalStudents } from "./PortalStudents.jsx";
import { PortalTeacher } from "./PortalTeacher.jsx";
import { haptic } from "../lib/tg.js";
import { navigate } from "../router.js";

export function PortalShell() {
  const [activeTab, setActiveTab] = useState("rating"); // rating, attendance, students, teacher

  const switchTab = (tab) => {
    if (tab !== activeTab) {
      haptic.selection();
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "rating":
        return <PortalRating />;
      case "attendance":
        return <PortalAttendance />;
      case "students":
        return <PortalStudents />;
      case "teacher":
        return <PortalTeacher />;
      default:
        return <PortalRating />;
    }
  };

  return (
    <div class="portal-app">
      {/* Header */}
      <header class="portal-header">
        <div class="portal-header-top">
          <div class="portal-brand">
            <div class="portal-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <div class="portal-brand-text">
              <h1>Falcon Koreys Tili</h1>
              <span>Ota-onalar portali</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span class="portal-mode-pill">Ota-onalar</span>
            <button
              onClick={() => navigate("home")}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "999px",
                color: "#94A3B8",
                fontSize: "11px",
                fontWeight: "600",
                padding: "4px 10px",
                cursor: "pointer"
              }}
              title="Admin panelga o'tish"
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main class="portal-container">
        {renderContent()}
      </main>

      {/* Luxury Bottom Navigation */}
      <nav class="portal-nav">
        <button
          class={`portal-nav-btn ${activeTab === "rating" ? "active" : ""}`}
          onClick={() => switchTab("rating")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Reyting</span>
        </button>

        <button
          class={`portal-nav-btn ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => switchTab("attendance")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Davomat</span>
        </button>

        <button
          class={`portal-nav-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => switchTab("students")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>O'quvchilar</span>
        </button>

        <button
          class={`portal-nav-btn ${activeTab === "teacher" ? "active" : ""}`}
          onClick={() => switchTab("teacher")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>O'qituvchi</span>
        </button>
      </nav>
    </div>
  );
}
