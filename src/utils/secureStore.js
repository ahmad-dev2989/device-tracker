import { isTauri } from "./tauri";
import { Capacitor } from "@capacitor/core";
// Register custom Capacitor plugin
const CapacitorSecureStorage = Capacitor.isNativePlatform()
    ? (await import("@capacitor/core")).registerPlugin("SecureStorage")
    : null;
/**
 * Unified cross-platform Secure Storage Interface
 */
export const secureStore = {
    /**
     * Save a key-value pair in native secure storage
     */
    async set(key, value) {
        if (isTauri()) {
            try {
                const { invoke } = await import("@tauri-apps/api/core");
                await invoke("save_secure_credential", { key, secret: value });
            }
            catch (e) {
                console.error("[SecureStorage] Tauri secure store error:", e);
                throw e;
            }
        }
        else if (Capacitor.isNativePlatform() && CapacitorSecureStorage) {
            try {
                await CapacitorSecureStorage.saveCredential({ key, value });
            }
            catch (e) {
                console.error("[SecureStorage] Capacitor secure store error:", e);
                throw e;
            }
        }
        else {
            console.warn(`[SecureStorage] Unsafe Fallback: Storing credential key "${key}" in LocalStorage for simulation.`);
            localStorage.setItem(`simulate_${key}`, value);
        }
    },
    /**
     * Retrieve a value by key from native secure storage
     */
    async get(key) {
        if (isTauri()) {
            try {
                const { invoke } = await import("@tauri-apps/api/core");
                const val = await invoke("get_secure_credential", { key });
                return val;
            }
            catch (e) {
                console.error("[SecureStorage] Tauri secure retrieve error:", e);
                return null;
            }
        }
        else if (Capacitor.isNativePlatform() && CapacitorSecureStorage) {
            try {
                const res = await CapacitorSecureStorage.getCredential({ key });
                return res?.value || null;
            }
            catch (e) {
                console.error("[SecureStorage] Capacitor secure retrieve error:", e);
                return null;
            }
        }
        else {
            return localStorage.getItem(`simulate_${key}`);
        }
    },
    /**
     * Delete a key from native secure storage
     */
    async remove(key) {
        if (isTauri()) {
            try {
                const { invoke } = await import("@tauri-apps/api/core");
                await invoke("delete_secure_credential", { key });
            }
            catch (e) {
                console.error("[SecureStorage] Tauri secure delete error:", e);
            }
        }
        else if (Capacitor.isNativePlatform() && CapacitorSecureStorage) {
            try {
                await CapacitorSecureStorage.deleteCredential({ key });
            }
            catch (e) {
                console.error("[SecureStorage] Capacitor secure delete error:", e);
            }
        }
        else {
            localStorage.removeItem(`simulate_${key}`);
        }
    },
    /**
     * Verify if a key exists in native secure storage
     */
    async exists(key) {
        const val = await this.get(key);
        return val !== null && val !== undefined;
    },
};
