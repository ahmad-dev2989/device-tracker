import { useState, useEffect } from "react";
import { isTauri } from "../utils/tauri";
import { Capacitor } from "@capacitor/core";

interface UpdateInfo {
  version: string;
  body: string;
}

// Fallback version for browser simulation
const SIMULATED_LOCAL_VERSION = "1.0.0";

// Helper to parse version components and suffixes
const parseVersion = (v: string) => {
  const clean = v.replace(/^v/, "");
  const match = clean.match(/^(\d+(?:\.\d+)*)(.*)$/);
  if (!match) return { numbers: [0], suffix: "" };
  
  const numbers = match[1].split(".").map(Number);
  const suffix = match[2] || "";
  return { numbers, suffix };
};

// Helper to compare semantic versions supporting suffixes (e.g., "1.0.2-qr" > "1.0.2")
const isNewerVersion = (remote: string, local: string): boolean => {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  
  for (let i = 0; i < Math.max(r.numbers.length, l.numbers.length); i++) {
    const rNum = r.numbers[i] || 0;
    const lNum = l.numbers[i] || 0;
    if (rNum > lNum) return true;
    if (rNum < lNum) return false;
  }
  
  if (r.suffix !== l.suffix) {
    if (!l.suffix && r.suffix) return true;
    if (l.suffix && !r.suffix) return false;
    return r.suffix > l.suffix;
  }
  
  return false;
};

export const useUpdateChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkUpdates = async () => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      if (isTauri()) {
        // --- 1. TAURI (DESKTOP) AUTO-UPDATER ---
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          setUpdateAvailable(true);
          setUpdateInfo({
            version: update.version,
            body: update.body || "Critical updates and security improvements.",
          });
        } else {
          setUpdateAvailable(false);
          setUpdateInfo(null);
        }
      } else if (Capacitor.isNativePlatform()) {
        // --- 2. CAPACITOR (MOBILE OTA) UPDATER ---
        const response = await fetch(
          "https://github.com/ahmad-dev2989/device-tracker/releases/latest/download/latest.json"
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch latest manifest: ${response.status}`);
        }
        const data = await response.json();
        const remoteVersion = data.version;

        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        const localVersion = info.version;

        if (isNewerVersion(remoteVersion, localVersion)) {
          setUpdateAvailable(true);
          setUpdateInfo({
            version: remoteVersion,
            body: "Mobile over-the-air performance and security update.",
          });
        } else {
          setUpdateAvailable(false);
          setUpdateInfo(null);
        }
      } else {
        // --- 3. BROWSER SIMULATION (REAL MANIFEST COMPARISON) ---
        console.log("[Update Checker] Checking remote GitHub Release manifest...");
        const response = await fetch(
          "https://github.com/ahmad-dev2989/device-tracker/releases/latest/download/latest.json"
        ).catch(() => null);

        if (response && response.ok) {
          const data = await response.json();
          const remoteVersion = data.version;
          if (isNewerVersion(remoteVersion, SIMULATED_LOCAL_VERSION)) {
            setUpdateAvailable(true);
            setUpdateInfo({
              version: remoteVersion,
              body: "Security updates, performance improvements, and bug fixes.",
            });
          } else {
            setUpdateAvailable(false);
          }
        } else {
          console.log("[Update Checker] No remote release or manifest found on GitHub. Hiding update banner.");
          setUpdateAvailable(false);
        }
      }
    } catch (e) {
      console.error("Update checking failed:", e);
      setUpdateAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const executeUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      if (isTauri()) {
        // --- 1. TAURI (DESKTOP) INSTALL AND RELAUNCH ---
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          await update.downloadAndInstall();
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        }
      } else if (Capacitor.isNativePlatform() && updateInfo) {
        // --- 2. CAPACITOR (MOBILE) OTA DOWNLOAD AND RELOAD ---
        const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
        const downloaded = await CapacitorUpdater.download({
          url: `https://github.com/ahmad-dev2989/device-tracker/releases/download/v${updateInfo.version}/dist.zip`,
          version: updateInfo.version,
        });
        await CapacitorUpdater.set(downloaded); // Triggers app reload into new bundle
      } else {
        // --- 3. BROWSER RELOAD SIMULATION ---
        console.log("[Update Checker] Reloading browser context to apply simulation...");
        window.location.reload();
      }
    } catch (e) {
      console.error("Update installation failed:", e);
      alert("Failed to install update. Please check application logs.");
    } finally {
      setIsUpdating(false);
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
