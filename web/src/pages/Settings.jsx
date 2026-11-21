import { useState } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showConfirm, closeApp } from "../lib/tg.js";
import { showToast } from "../components/Toast.jsx";

export function Settings() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    const ok = await showConfirm("Admin paneldan chiqasizmi?");
    if (!ok) return;

    setIsLoggingOut(true);
    try {
      await apiRequest("/api/admin/logout", { method: "POST" });
      showToast("Chiqildi", "info");
      closeApp();
    } catch (err) {
      console.error("Logout error:", err);
      closeApp();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div class="settings-page">
      <h2 class="home-title">Sozlamalar</h2>

      <div class="settings-group-card">
        <span class="settings-group-title">Dars jadvallari va vaqt</span>

        <div class="settings-item-row">
          <span class="settings-item-label">Soat mintaqasi</span>
          <span class="settings-item-val">Toshkent (UTC+5)</span>
        </div>

        <div class="settings-item-row">
          <span class="settings-item-label">1-dars oynasi</span>
          <span class="settings-item-val">07:00 - 12:00</span>
        </div>

        <div class="settings-item-row">
          <span class="settings-item-label">2-dars oynasi</span>
          <span class="settings-item-val">15:30 - 20:00</span>
        </div>

        <div class="settings-item-row">
          <span class="settings-item-label">Dam olish kunlari</span>
          <span class="settings-item-val">Shanba, Yakshanba</span>
        </div>
      </div>

      <div class="settings-group-card">
        <span class="settings-group-title">Tizim ma'lumotlari</span>

        <div class="settings-item-row">
          <span class="settings-item-label">Ilova versiyasi</span>
          <span class="settings-item-val">2.0</span>
        </div>

        <div class="settings-item-row">
          <span class="settings-item-label">Xavfsizlik</span>
          <span class="settings-item-val">Faol</span>
        </div>
      </div>

      <button
        type="button"
        class="btn-danger-outline"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "Chiqilmoqda..." : "Admin paneldan chiqish"}
      </button>
    </div>
  );
}
