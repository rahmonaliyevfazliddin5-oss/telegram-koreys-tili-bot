export function Blocked({ seconds = 1800 }) {
  return (
    <div style={{ padding: "40px 16px", textAlign: "center" }}>
      <h2>Admin kirish bloklangan</h2>
      <p style={{ marginTop: "12px", color: "var(--muted)" }}>
        Xavfsizlik maqsadida 3 marta noto'g'ri kod kiritilgani sababli kirish vaqtincha to'xtatildi.
      </p>
    </div>
  );
}
