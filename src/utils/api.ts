import { getAppPlatform } from "./platform";
import { secureStore } from "./secureStore";
import { Capacitor } from "@capacitor/core";

// Configure default API endpoint
let API_BASE_URL = "http://localhost:3000";

if (typeof window !== "undefined") {
  const customUrl = localStorage.getItem("OMNI_RECOVER_API_URL");
  if (customUrl) {
    API_BASE_URL = customUrl;
  } else if (Capacitor.isNativePlatform()) {
    // 10.0.2.2 is the Android emulator's route back to host machine's localhost
    API_BASE_URL = "http://10.0.2.2:3000";
  } else {
    // Web browser environment: connect to the same host on port 3000
    const hostname = window.location.hostname || "localhost";
    API_BASE_URL = `http://${hostname}:3000`;
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url;
}

/**
 * Perform an authenticated fetch request, handling access token renewal if needed
 */
async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await secureStore.get("accessToken");
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  let res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  // Handle Token Expiry
  if (res.status === 403 || res.status === 401) {
    console.log("[API] Access token expired or forbidden, attempting refresh...");
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry with new token
      const newToken = await secureStore.get("accessToken");
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    }
  }

  return res;
}

/**
 * Handle token refresh rotation
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const rToken = await secureStore.get("refreshToken");
  if (!rToken) {
    console.warn("[API] No refresh token found, cannot refresh session");
    return false;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rToken }),
    });

    if (!res.ok) {
      throw new Error(`Refresh rejected with status ${res.status}`);
    }

    const data = await res.json();
    await secureStore.set("accessToken", data.accessToken);
    await secureStore.set("refreshToken", data.refreshToken);
    console.log("[API] Token refresh succeeded");
    return true;
  } catch (err) {
    console.error("[API] Token refresh failed, session revoked:", err);
    // Clear credentials to force re-authentication
    await secureStore.remove("accessToken");
    await secureStore.remove("refreshToken");
    return false;
  }
}

/**
 * API Methods
 */
export const api = {
  /**
   * Register a new device with the backend
   */
  async registerDevice(body: {
    id: string;
    publicKey: string;
    deviceType: "LAPTOP" | "MOBILE";
    name: string;
    platform: string;
    appVersion: string;
  }): Promise<{ deviceId: string; userId: string }> {
    const res = await fetch(`${API_BASE_URL}/api/devices/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Registration failed with status ${res.status}`);
    }

    return res.json();
  },

  /**
   * Fetch challenge nonce for login
   */
  async getChallenge(deviceId: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to fetch challenge");
    }

    const data = await res.json();
    return data.challenge;
  },

  /**
   * Submit signature to authenticate device and get credentials
   */
  async login(
    deviceId: string,
    signature: string
  ): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, signature }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Authentication rejected");
    }

    return res.json();
  },

  /**
   * Revoke current authentication session
   */
  async logout(): Promise<void> {
    const rToken = await secureStore.get("refreshToken");
    if (rToken) {
      await fetch(`${API_BASE_URL}/api/auth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rToken }),
      }).catch((e) => console.error("[API] Revocation request failed:", e));
    }
    // Delete local secrets
    await secureStore.remove("accessToken");
    await secureStore.remove("refreshToken");
    await secureStore.remove("deviceId");
    await secureStore.remove("privateKey");
    await secureStore.remove("publicKey");
    await secureStore.remove("userId");
  },

  /**
   * Retrieve active authenticated device profile
   */
  async getMe(): Promise<any> {
    const res = await authenticatedFetch("/api/devices/me", { method: "GET" });
    if (!res.ok) {
      throw new Error("Failed to fetch device details");
    }
    return res.json();
  },

  /**
   * Retrieve a paired/associated device details
   */
  async getDeviceById(id: string): Promise<any> {
    const res = await authenticatedFetch(`/api/devices/${id}`, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Failed to fetch device: ${id}`);
    }
    return res.json();
  },

  /**
   * Send heartbeat to update server status
   */
  async sendHeartbeat(appVersion: string): Promise<any> {
    const res = await authenticatedFetch("/api/devices/heartbeat", {
      method: "POST",
      body: JSON.stringify({ appVersion }),
    });

    if (!res.ok) {
      throw new Error("Heartbeat rejected");
    }

    return res.json();
  },

  /**
   * Create a new pairing request
   */
  async createPairingRequest(): Promise<{ requestId: string; pairingCode: string; expiresAt: string; expiresIn: number }> {
    const res = await authenticatedFetch("/api/pairings/request", {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Failed to create pairing request");
    }
    return res.json();
  },

  /**
   * Validate a pairing request
   */
  async validatePairingRequest(requestId: string | null, pairingCode: string): Promise<{ requestId: string; status: string; device: any; expiresAt: string }> {
    const res = await authenticatedFetch("/api/pairings/validate", {
      method: "POST",
      body: JSON.stringify({ requestId, pairingCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to validate pairing code");
    }
    return res.json();
  },

  /**
   * Approve a pairing request
   */
  async approvePairingRequest(requestId: string, pairingCode: string): Promise<{ success: boolean; pairingId: string }> {
    const res = await authenticatedFetch("/api/pairings/approve", {
      method: "POST",
      body: JSON.stringify({ requestId, pairingCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to approve pairing");
    }
    return res.json();
  },

  /**
   * Cancel an active pairing request
   */
  async cancelPairingRequest(requestId: string): Promise<void> {
    const res = await authenticatedFetch("/api/pairings/cancel", {
      method: "POST",
      body: JSON.stringify({ requestId }),
    });
    if (!res.ok) {
      throw new Error("Failed to cancel pairing request");
    }
  },

  /**
   * Get pairing request status
   */
  async getPairingStatus(requestId: string): Promise<{ requestId: string; status: string; pairedDevice: any }> {
    const res = await authenticatedFetch(`/api/pairings/status/${requestId}`, {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error("Failed to retrieve pairing status");
    }
    return res.json();
  },

  /**
   * Revoke pairing relation
   */
  async unpairDevice(): Promise<void> {
    const res = await authenticatedFetch("/api/pairings/unpair", {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Failed to unpair device");
    }
  },

  /**
   * Retrieve active pairing information
   */
  async getActivePairing(): Promise<{ paired: boolean; pairingId?: string; device?: any }> {
    const res = await authenticatedFetch("/api/pairings/active", {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error("Failed to query active pairing");
    }
    return res.json();
  },

  /**
   * Retrieve paired/associated device telemetry and connection status
   */
  async getPairedTelemetry(): Promise<{ deviceId: string; name: string; platform: string; status: string; lastSeenAt: string; telemetry: any }> {
    const res = await authenticatedFetch("/api/devices/paired/telemetry", {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error("Failed to query paired telemetry");
    }
    return res.json();
  },
};
