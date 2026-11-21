import { useEffect } from "preact/hooks";

export function Sheet({ isOpen, onClose, children, maxHeight = "90vh" }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      class="backdrop sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div class="sheet-panel" style={{ maxHeight }}>
        <div class="sheet-handle" onClick={onClose} />
        {children}
      </div>
    </div>
  );
}
