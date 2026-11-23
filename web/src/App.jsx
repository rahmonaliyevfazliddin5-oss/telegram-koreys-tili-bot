import { useState, useEffect } from "preact/hooks";
import { subscribeRoute } from "./router.js";
import { initTelegramApp, getInitData } from "./lib/tg.js";
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
  const [isAdmin, setIsAdmin] = useState(null); // null = tekshirilmoqda, true = admin, false = foydalanuvchi

  useEffect(() => {
    initTelegramApp();
    startStatusPolling();
    const unsub = subscribeRoute(setRoute);

    // Admin autentifikatsiyasini tekshirish (Faqat /admin orqali kirganlar admin bo'la oladi)
    const initData = getInitData();
    fetch("/api/portal/me", {
      headers: {
        Authorization: `tma ${initData}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(Boolean(data && data.is_admin));
      })
      .catch(() => {
        setIsAdmin(false);
      });

    return () => {
      unsub();
      stopStatusPolling();
    };
  }, []);

  // Tekshirish paytida toza yuklanish indikatori
  if (isAdmin === null) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFF7F8",
        color: "#6B7280",
        fontSize: "14px",
        fontWeight: "600"
      }}>
        Yuklanmoqda...
      </div>
    );
  }

  // Oddiy foydalanuvchi yoki ota-ona bo'lsa:
  // Admin panel butunlay maxfiy, faqat toza Portal ko'rsatiladi
  if (!isAdmin) {
    return <PortalShell />;
  }

  // Admin sessiyasi mavjud bo'lsa: to'liq boshqaruv imkoniyatlari
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

  return (
    <AppShell currentRoute={route} hasDock={hasDock}>
      {renderPage()}
    </AppShell>
  );
}
