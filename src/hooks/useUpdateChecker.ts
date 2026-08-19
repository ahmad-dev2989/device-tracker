import { useState, useEffect } from "react";
import { isTauri } from "../utils/tauri";

interface UpdateInfo {
  version: string;
  body: string;
}

export const useUpdateChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkUpdates = async () => {
    setIsChecking(true);
    if (isTauri()) {
      try {
        // Tauri v2 plugin updater resolution
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          setUpdateAvailable(true);
          setUpdateInfo({
            version: update.version,
            body: update.body || "Critical updates and security improvements.",
          });
        }
      } catch (e) {
        console.error("Tauri Auto-Updater error:", e);
      }
    } else {
      // Browser Simulation: checks releases and trigger mock banner after a slight delay
      console.log("[Tauri Simulation] Checking GitHub Release endpoint for updates...");
      setTimeout(() => {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: "1.0.4",
          body: "Security Handshake hotfix, BLE offline mesh synchronization performance improvements, and silent shutter webcam fixes.",
        });
      }, 3000);
    }
    setIsChecking(false);
  };

  const executeUpdate = async () => {
    setIsUpdating(true);
    if (isTauri()) {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          // Download and install release
          await update.downloadAndInstall();
          console.log("Auto Update downloaded and installed successfully.");
        }
      } catch (e) {
        console.error("Tauri Update Installation error:", e);
      }
    } else {
      console.log("[Tauri Simulation] Downloading release binaries from Github Releases...");
      setTimeout(() => {
        setIsUpdating(false);
        setUpdateAvailable(false);
        alert("Simulation: Update binaries installed successfully. Restarting application context...");
        window.location.reload();
      }, 2000);
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  // Run updater check on boot
  useEffect(() => {
    checkUpdates();
  }, []);

  return {
    updateAvailable,
    updateInfo,
    isChecking,
    isUpdating,
    executeUpdate,
    dismissUpdate,
    checkUpdates,
  };
};
