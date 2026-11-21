import { useState, useEffect } from "preact/hooks";
import { apiRequest } from "../lib/api.js";
import { showToast } from "../components/Toast.jsx";
import { navigate } from "../router.js";

export function Sources() {
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSources = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest("/api/sources");
      if (Array.isArray(data)) {
        setSources(data);
      }
    } catch (err) {
      showToast(err.message || "Manbalarni yuklashda xatolik", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  return (
    <div class="sources-page">
      <h2 class="home-title">O'quv manbalari</h2>

      {isLoading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
          Yuklanmoqda...
        </div>
      ) : sources.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
          Hozircha manbalar mavjud emas
        </div>
      ) : (
        sources.map((s) => (
          <div
            key={s.id}
            class="source-card-item"
            onClick={() => navigate(`source-form/${s.id}`)}
          >
            <span class="source-card-title">{s.title_uz || s.title}</span>
            <span class="source-card-text">{s.text_uz || s.text}</span>
          </div>
        ))
      )}

      {/* FAB: Yangi manba qo'shish */}
      <button
        type="button"
        class="fab"
        onClick={() => navigate("source-form")}
        title="Manba qo'shish"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
}
