import { backButton, showConfirm, closeApp } from "./lib/tg.js";
import { apiRequest } from "./lib/api.js";
import { hasUnsavedChanges } from "./store/gradingDraft.js";
import { showToast } from "./components/Toast.jsx";

const MAIN_TABS = ["home", "students", "grades", "settings"];

let currentRoute = { page: "home", params: {} };
const historyStack = [];
const routeListeners = new Set();

export function parseHash(hash) {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const defaultPage = mode === "portal" ? "portal" : "home";

  const clean = (hash || window.location.hash || `#${defaultPage}`).replace(/^#\/?/, "");
  const [pageWithParams, ...rest] = clean.split("?");
  const parts = pageWithParams.split("/");
  const page = parts[0] || defaultPage;
  const id = parts[1] || null;

  const query = {};
  if (rest.length > 0) {
    new URLSearchParams(rest.join("?")).forEach((v, k) => { query[k] = v; });
  }

  return { page, id, query };
}

export function navigate(path, { replace = false } = {}) {
  if (hasUnsavedChanges()) {
    showToast("Avval o'zgarishlarni saqlang", "warn");
    return;
  }
  const newHash = path.startsWith("#") ? path : `#${path}`;
  if (replace) {
    window.location.replace(newHash);
  } else {
    window.location.hash = newHash;
  }
}

export async function handleBack() {
  // 1. Saqlanmagan o'zgarishlar bormi?
  if (hasUnsavedChanges()) {
    showToast("Avval o'zgarishlarni saqlang", "warn");
    return;
  }

  const { page } = currentRoute;

  // 1.5. Portal sahifasida bo'lsa darhol ilovani yopish
  if (page === "portal") {
    closeApp();
    return;
  }

  // 2. Asosiy 4 ta tabda bo'lsa: Admin paneldan chiqish tasdig'i
  if (MAIN_TABS.includes(page)) {
    const exit = await showConfirm("Admin paneldan chiqasizmi?");
    if (exit) {
      try {
        await apiRequest("/api/admin/logout", { method: "POST" });
      } catch (err) {
        console.error("Logout error:", err);
      }
      closeApp();
    }
    return;
  }

  // 3. Ichki sahifada bo'lsa: orqaga qaytish
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate("home");
  }
}

export function subscribeRoute(cb) {
  routeListeners.add(cb);
  cb(currentRoute);
  return () => routeListeners.delete(cb);
}

function notifyRoute() {
  for (const cb of routeListeners) {
    try { cb(currentRoute); } catch (e) { console.error(e); }
  }
}

export function initRouter() {
  const onHashChange = () => {
    currentRoute = parseHash(window.location.hash);
    notifyRoute();

    // BackButtonni boshqarish
    backButton.show(handleBack);
  };

  window.addEventListener("hashchange", onHashChange);
  onHashChange();
}

export function getCurrentRoute() {
  return currentRoute;
}
