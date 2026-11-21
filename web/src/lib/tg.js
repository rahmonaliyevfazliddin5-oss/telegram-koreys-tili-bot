const tg = window.Telegram?.WebApp;

export function initTelegramApp() {
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();

    // B1: Telegram header va foni ilova foniga (#FFF7F8) moslanadi, qizil plita yo'qoladi
    if (typeof tg.setHeaderColor === "function") {
      tg.setHeaderColor("#FFF7F8");
    }
    if (typeof tg.setBackgroundColor === "function") {
      tg.setBackgroundColor("#FFF7F8");
    }
    if (typeof tg.setBottomBarColor === "function") {
      tg.setBottomBarColor("#FFF7F8");
    }
  } catch (e) {
    console.warn("Telegram WebApp init warning:", e);
  }

  // Klaviatura ochilganda aniqlash
  if (tg.onEvent) {
    tg.onEvent("viewportChanged", ({ isStateStable }) => {
      if (isStateStable && tg.viewportHeight && tg.viewportStableHeight) {
        const isKeyboard = tg.viewportHeight < tg.viewportStableHeight - 80;
        document.body.classList.toggle("keyboard-open", isKeyboard);
      }
    });
  }

  window.addEventListener("focusin", (e) => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
      document.body.classList.add("keyboard-open");
    }
  });

  window.addEventListener("focusout", (e) => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
      document.body.classList.remove("keyboard-open");
    }
  });
}

export const haptic = {
  impact: (style = "light") => {
    try { tg?.HapticFeedback?.impactOccurred(style); } catch (_) {}
  },
  notification: (type = "success") => {
    try { tg?.HapticFeedback?.notificationOccurred(type); } catch (_) {}
  },
  selection: () => {
    try { tg?.HapticFeedback?.selectionChanged(); } catch (_) {}
  }
};

let backButtonHandler = null;

export const backButton = {
  show: (callback) => {
    if (!tg?.BackButton) return;
    if (backButtonHandler) {
      tg.BackButton.offClick(backButtonHandler);
    }
    backButtonHandler = callback;
    tg.BackButton.onClick(callback);
    tg.BackButton.show();
  },
  hide: () => {
    if (!tg?.BackButton) return;
    if (backButtonHandler) {
      tg.BackButton.offClick(backButtonHandler);
      backButtonHandler = null;
    }
    tg.BackButton.hide();
  }
};

export function showConfirm(message) {
  return new Promise((resolve) => {
    if (tg?.showConfirm) {
      tg.showConfirm(message, (confirmed) => resolve(Boolean(confirmed)));
    } else {
      resolve(window.confirm(message));
    }
  });
}

export function getInitData() {
  return tg?.initData || "";
}

export function closeApp() {
  try { tg?.close(); } catch (_) {}
}
