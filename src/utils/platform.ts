import { isTauri } from "./tauri";
import { Capacitor } from "@capacitor/core";

export const getAppPlatform = (): "desktop" | "mobile" => {
  if (isTauri()) {
    return "desktop";
  }
  if (Capacitor.isNativePlatform()) {
    return "mobile";
  }
  
  // Responsive fallback for browser testing
  if (typeof window !== "undefined") {
    const ua = window.navigator.userAgent.toLowerCase();
    const isMobileUA = /iphone|ipad|ipod|android|blackberry|mini|windows\s+phone|mobile/i.test(ua);
    if (isMobileUA || window.innerWidth < 768) {
      return "mobile";
    }
  }
  return "desktop";
};
