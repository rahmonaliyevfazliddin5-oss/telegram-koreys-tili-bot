import { TabBar } from "./TabBar.jsx";
import { ToastContainer } from "./Toast.jsx";

const MAIN_TABS = ["home", "students", "grades", "settings"];

export function AppShell({ currentRoute, children, hasDock = false }) {
  const { page } = currentRoute;
  const isMainTab = MAIN_TABS.includes(page);

  return (
    <div class="app-shell">
      <ToastContainer />
      <main class={`page-content fade-slide-enter ${hasDock ? "has-dock" : ""}`}>
        {children}
      </main>
      {isMainTab && <TabBar activeTab={page} />}
    </div>
  );
}
