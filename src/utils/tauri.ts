/**
 * Utility checks to safely determine if the application is running inside a Tauri native webview
 * or a standard web browser, providing functional simulation fallbacks.
 */
export const isTauri = (): boolean => {
  return (
    typeof window !== "undefined" &&
    ((window as any).__TAURI_INTERNALS__ !== undefined ||
      (window as any).__tauri_ipc__ !== undefined)
  );
};

/**
 * Native Window Minimize with browser simulation fallback
 */
export const minimizeWindow = async () => {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error("Tauri window minimize error:", e);
    }
  } else {
    console.log("[Tauri Simulation] minimizeWindow() invoked.");
    const notification = document.createElement("div");
    notification.className = "fixed bottom-4 left-4 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl z-50 animate-bounce";
    notification.innerText = "Simulation: Window Minimized to system tray.";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }
};

/**
 * Native Window Maximize/Unmaximize toggle with browser simulation fallback
 */
export const toggleMaximizeWindow = async () => {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWin = getCurrentWindow();
      if (await appWin.isMaximized()) {
        await appWin.unmaximize();
      } else {
        await appWin.maximize();
      }
    } catch (e) {
      console.error("Tauri window toggle maximize error:", e);
    }
  } else {
    console.log("[Tauri Simulation] toggleMaximizeWindow() invoked.");
  }
};

/**
 * Native Window Close with browser simulation fallback
 */
export const closeWindow = async () => {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch (e) {
      console.error("Tauri window close error:", e);
    }
  } else {
    console.log("[Tauri Simulation] closeWindow() invoked.");
    const confirmation = window.confirm("Simulation: Close application process?");
    if (confirmation) {
      window.close();
    }
  }
};
