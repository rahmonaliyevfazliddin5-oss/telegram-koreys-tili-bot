import { useState, useEffect } from "preact/hooks";
import { subscribeRoute } from "./router.js";
import { initTelegramApp } from "./lib/tg.js";
import { startStatusPolling, stopStatusPolling } from "./store/status.js";
import { AppShell } from "./components/AppShell.jsx";

// Sahifalar
import { Home } from "./pages/Home.jsx";
import { Students } from "./pages/Students.jsx";
import { StudentProfile } from "./pages/StudentProfile.jsx";
import { StudentForm } from "./pages/StudentForm.jsx";
import { Grading } from "./pages/Grading.jsx";
import { ExamList } from "./pages/ExamList.jsx";
import { ExamForm } from "./pages/ExamForm.jsx";
import { Sources } from "./pages/Sources.jsx";
import { SourceForm } from "./pages/SourceForm.jsx";
import { TeacherProfile } from "./pages/TeacherProfile.jsx";
import { Settings } from "./pages/Settings.jsx";
import { Blocked } from "./pages/Blocked.jsx";
import { Denied } from "./pages/Denied.jsx";
import { PortalShell } from "./portal/PortalShell.jsx";

export function App() {
  const [route, setRoute] = useState({ page: "home", id: null, query: {} });

  useEffect(() => {
    initTelegramApp();
    startStatusPolling();
    const unsub = subscribeRoute(setRoute);
    return () => {
      unsub();
      stopStatusPolling();
    };
  }, []);

  const renderPage = () => {
    switch (route.page) {
      case "home":
        return <Home />;
      case "students":
        return <Students />;
      case "student-profile":
        return <StudentProfile id={route.id} />;
      case "student-form":
        return <StudentForm id={route.id} />;
      case "grades":
        return <Grading lesson={route.query?.lesson} />;
      case "exam-list":
        return <ExamList />;
      case "exam-form":
        return <ExamForm />;
      case "sources":
        return <Sources />;
      case "source-form":
        return <SourceForm id={route.id} />;
      case "teacher":
        return <TeacherProfile />;
      case "settings":
        return <Settings />;
      case "blocked":
        return <Blocked />;
      case "denied":
        return <Denied />;
      default:
        return <Home />;
    }
  };

  const hasDock = route.page === "grades" || route.page === "student-form" || route.page === "source-form";

  if (route.page === "portal") {
    return <PortalShell />;
  }

  return (
    <AppShell currentRoute={route} hasDock={hasDock}>
      {renderPage()}
    </AppShell>
  );
}
