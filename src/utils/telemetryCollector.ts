import { secureStore } from "./secureStore";

export interface LocationTelemetry {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  source: "GPS" | "NETWORK" | "WIFI" | "IP" | "SYSTEM" | "UNKNOWN";
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface DeviceTelemetry {
  deviceId: string;
  timestamp: string;
  location?: LocationTelemetry;
  battery?: {
    level: number;
    charging: boolean;
  };
  power?: {
    state: string;
  };
  network?: {
    connected: boolean;
    type: string;
  };
  appVersion: string;
  platform: string;
}

export const TELEMETRY_CONFIG = {
  updateIntervalMs: 60000,          // Collect and send every 60 seconds
  minDistanceChangeMeters: 10,       // Skip location send if distance is less than 10 meters
  maxTimeStationaryForceMs: 300000,  // Force location send every 5 minutes even if stationary
  locationTimeoutMs: 15000,          // 15 seconds timeout
  enableHighAccuracy: true,          // Use precise location where available
};

// Haversine formula to compute distance between two coordinates in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by this browser/platform."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function fetchIpLocation(): Promise<LocationTelemetry | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("IP Geolocation endpoint returned error status");
    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 50000, // Coarse estimate for IP-based accuracy (~50km)
        timestamp: new Date().toISOString(),
        source: "IP",
      };
    }
  } catch (err) {
    console.warn("[TelemetryCollector] IP Location fallback failed:", err);
  }
  return null;
}

async function getBatteryInfo(): Promise<{ level: number; charging: boolean } | undefined> {
  try {
    if ("getBattery" in navigator) {
      const battery = await (navigator as any).getBattery();
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
      };
    }
  } catch (err) {
    console.warn("[TelemetryCollector] Battery status check failed:", err);
  }
  return undefined;
}

function getNetworkInfo(): { connected: boolean; type: string } {
  const connected = navigator.onLine;
  let type = "unknown";
  try {
    if ("connection" in navigator) {
      const conn = (navigator as any).connection;
      type = conn.type || conn.effectiveType || "unknown";
    }
  } catch (e) {
    // Ignore error
  }
  return { connected, type };
}

class TelemetryCollector {
  private timer: any = null;
  private lastSentLocation: LocationTelemetry | null = null;
  private lastLocationSentTime: number = 0;
  private onTelemetryCallback: ((telemetry: DeviceTelemetry) => void) | null = null;
  private isCollecting = false;

  public start(onTelemetry: (telemetry: DeviceTelemetry) => void) {
    if (this.isCollecting) return;
    this.isCollecting = true;
    this.onTelemetryCallback = onTelemetry;

    // Trigger initial collection on start
    this.collectAndReport();

    // Set recurring timer
    this.timer = setInterval(() => {
      this.collectAndReport();
    }, TELEMETRY_CONFIG.updateIntervalMs);
  }

  public stop() {
    this.isCollecting = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onTelemetryCallback = null;
  }

  public async collectAndReport() {
    try {
      const location = await this.collectLocation();
      const battery = await getBatteryInfo();
      const network = getNetworkInfo();
      const appVersion = await secureStore.get("appVersion") || "1.0.9";
      const deviceId = await secureStore.get("deviceId") || "";
      const platformName = window.navigator.userAgent.includes("Android") ? "Android" : "Desktop";

      const telemetry: DeviceTelemetry = {
        deviceId,
        timestamp: new Date().toISOString(),
        battery,
        network,
        appVersion,
        platform: platformName,
      };

      if (location) {
        const shouldSend = this.evaluateLocationUpdateStrategy(location);
        if (shouldSend) {
          telemetry.location = location;
          this.lastSentLocation = location;
          this.lastLocationSentTime = Date.now();
        }
      }

      if (this.onTelemetryCallback && this.isCollecting) {
        this.onTelemetryCallback(telemetry);
      }
    } catch (e) {
      console.error("[TelemetryCollector] Error during periodic loop:", e);
    }
  }

  private evaluateLocationUpdateStrategy(newLoc: LocationTelemetry): boolean {
    if (!this.lastSentLocation) {
      return true;
    }

    const timeDiff = Date.now() - this.lastLocationSentTime;
    if (timeDiff >= TELEMETRY_CONFIG.maxTimeStationaryForceMs) {
      return true;
    }

    const distance = getDistance(
      this.lastSentLocation.latitude,
      this.lastSentLocation.longitude,
      newLoc.latitude,
      newLoc.longitude
    );

    if (distance >= TELEMETRY_CONFIG.minDistanceChangeMeters) {
      return true;
    }

    return false;
  }

  public async collectLocation(): Promise<LocationTelemetry | null> {
    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: TELEMETRY_CONFIG.enableHighAccuracy,
        timeout: TELEMETRY_CONFIG.locationTimeoutMs,
        maximumAge: 10000,
      });

      const acc = pos.coords.accuracy;
      // GPS vs System heuristics: GPS is generally very accurate (<30m)
      const source = acc <= 30 ? "GPS" : "SYSTEM";

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: acc,
        timestamp: new Date(pos.timestamp).toISOString(),
        source,
        altitude: pos.coords.altitude || undefined,
        heading: pos.coords.heading || undefined,
        speed: pos.coords.speed || undefined,
      };
    } catch (err: any) {
      console.warn("[TelemetryCollector] Native location tracking failed. Attempting IP fallback...", err.message);
    }

    return await fetchIpLocation();
  }
}

export const telemetryCollector = new TelemetryCollector();
