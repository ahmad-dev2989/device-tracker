import { useState, useEffect } from "react";
import { Titlebar } from "./components/Titlebar";
import { DesktopDashboard } from "./views/DesktopDashboard";
import { MobileDashboard } from "./views/MobileDashboard";
import { EmergencyLockView } from "./views/EmergencyLockView";
import { useUpdateChecker } from "./hooks/useUpdateChecker";
import { getAppPlatform } from "./utils/platform";
import { secureStore } from "./utils/secureStore";
import { api, getApiBaseUrl } from "./utils/api";
import { generateDeviceKeyPair, signChallenge } from "./utils/crypto";
import { connectionManager } from "./utils/connectionManager";
import type { ConnectionState } from "./utils/connectionManager";
import { telemetryCollector } from "./utils/telemetryCollector";

// Icons
import {
  Volume2,
  Power,
  X,
  Smartphone
} from "lucide-react";

interface LogMessage {
  timestamp: string;
  type: "SYS" | "LOC" | "NET" | "ERR" | "WARN";
  message: string;
}

const PRE_SEEDED_LOGS: LogMessage[] = [
  { timestamp: new Date().toISOString().split("T")[1].substring(0, 12) + "Z", type: "SYS", message: "OmniRecover console shell initialized." },
];

function App() {
  // Platform Detection
  const [platform, setPlatform] = useState<"desktop" | "mobile">(getAppPlatform());

  // Backend Connection and Identity State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("Connecting");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      setPlatform(getAppPlatform());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pairing State
  const [pairedDevice, setPairedDevice] = useState<any | null>(null);
  const [pairingRequest, setPairingRequest] = useState<any | null>(null);
  const [targetTelemetry, setTargetTelemetry] = useState<any | null>(null);
  const [localCoords, setLocalCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchTargetTelemetry = async () => {
    try {
      const res = await api.getPairedTelemetry();
      if (res) {
        setTargetTelemetry(res.telemetry);
        setPartnerConnected(res.status === "ONLINE");
      }
    } catch (e) {
      console.warn("Failed to fetch paired telemetry:", e);
    }
  };

  const checkActivePairing = async () => {
    try {
      const res = await api.getActivePairing();
      if (res.paired) {
        setPairedDevice(res.device);
        setPartnerConnected(res.device.status === "ONLINE");
        await secureStore.set("pairedDevice", JSON.stringify(res.device));
        await fetchTargetTelemetry();
      } else {
        setPairedDevice(null);
        setPartnerConnected(false);
        setTargetTelemetry(null);
        await secureStore.remove("pairedDevice");
      }
    } catch (e) {
      console.warn("Failed to check active pairing:", e);
    }
  };

  // Backend Initialization
  const initBackendSession = async () => {
    setConnectionStatus("Connecting");
    try {
      let storedDeviceId = await secureStore.get("deviceId");
      let storedPrivateKeyStr = await secureStore.get("privateKey");
      let privateKeyJwk: any = null;

      let appVersion = "1.0.9";
      try {
        if (platform === "desktop") {
          const { getVersion } = await import("@tauri-apps/api/app");
          appVersion = await getVersion();
        } else {
          const { App } = await import("@capacitor/app");
          const info = await App.getInfo();
          appVersion = info.version;
        }
      } catch (err) {
        console.warn("Could not retrieve native version:", err);
      }

      if (!storedDeviceId || !storedPrivateKeyStr) {
        addLog("SYS", "Generating fresh device identity...");
        const newId = window.crypto.randomUUID();
        const { publicKeyJwk, privateKeyJwk: generatedPrivateKey } = await generateDeviceKeyPair();

        const deviceName = platform === "desktop" ? "Tauri Laptop Client" : "Android Mobile Client";
        const platformName = platform === "desktop" ? "Desktop" : "Android";

        addLog("SYS", "Registering device identity with backend...");
        const regRes = await api.registerDevice({
          id: newId,
          publicKey: JSON.stringify(publicKeyJwk),
          deviceType: platform === "desktop" ? "LAPTOP" : "MOBILE",
          name: deviceName,
          platform: platformName,
          appVersion,
        });

        // Store identity in secure key vault
        await secureStore.set("deviceId", newId);
        await secureStore.set("userId", regRes.userId);
        await secureStore.set("privateKey", JSON.stringify(generatedPrivateKey));
        await secureStore.set("publicKey", JSON.stringify(publicKeyJwk));
        await secureStore.set("appVersion", appVersion);

        storedDeviceId = newId;
        privateKeyJwk = generatedPrivateKey;
        addLog("SYS", "Device identity registered and stored securely.");
      } else {
        privateKeyJwk = JSON.parse(storedPrivateKeyStr);
        addLog("SYS", `Secure device identity loaded: ${storedDeviceId.substring(0, 8)}...`);
      }

      setDeviceId(storedDeviceId);

      // --- CRYPTOGRAPHIC AUTHENTICATION ---
      addLog("SYS", "Requesting auth challenge...");
      const challenge = await api.getChallenge(storedDeviceId);
      
      addLog("SYS", "Signing challenge with private key...");
      const signature = await signChallenge(challenge, privateKeyJwk);

      addLog("SYS", "Submitting signature to authenticate...");
      const loginRes = await api.login(storedDeviceId, signature);

      await secureStore.set("accessToken", loginRes.accessToken);
      await secureStore.set("refreshToken", loginRes.refreshToken);
      await secureStore.set("userId", loginRes.userId);

      // Load active pairing if it exists
      await checkActivePairing();
      
      setConnectionStatus("Connected");
      addLog("SYS", "Mutual cryptographic authentication PASSED.");

      const saved = await secureStore.get("pairedDevice");
      if (saved) {
        connectionManager.connect();
      }
    } catch (err: any) {
      console.error("[Backend Init Failed]", err);
      
      if (err.message?.includes("Device not registered")) {
        addLog("ERR", "Device identity not recognized by server. Re-generating identity...");
        await secureStore.remove("deviceId");
        await secureStore.remove("privateKey");
        await secureStore.remove("publicKey");
        // Reconnect immediately to trigger a fresh registration
        initBackendSession();
        return;
      }
      
      const isNetworkError = err.message?.includes("failed to fetch") || 
                             err.message?.includes("fetch failed") || 
                             err.message?.includes("Failed to fetch") ||
                             err.message?.includes("NetworkError") ||
                             err.message?.includes("TypeError");
                             
      if (isNetworkError) {
        addLog("NET", "Backend server is offline or unreachable.");
        setConnectionStatus("Offline");
        
        // Try connecting WebSocket if paired so it starts the retry loop
        const saved = await secureStore.get("pairedDevice");
        if (saved) {
          connectionManager.connect();
        }
        
        // Retry connection with backoff
        scheduleReconnect();
      } else {
        addLog("ERR", `Backend authentication error: ${err.message || err}`);
        setConnectionStatus("AuthFailed");
      }
    }
  };

  const scheduleReconnect = () => {
    // Exponential backoff starting at 5s, doubling up to 60s
    const delay = Math.min(60000, 5000 * Math.pow(2, reconnectAttempts));
    setReconnectAttempts((prev) => prev + 1);
    console.log(`[API] Reconnection scheduled in ${delay}ms (attempt ${reconnectAttempts + 1})`);
    setTimeout(() => {
      initBackendSession();
    }, delay);
  };

  // Run initial setup on boot
  useEffect(() => {
    const loadSavedPairing = async () => {
      const saved = await secureStore.get("pairedDevice");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPairedDevice(parsed);
          setPartnerConnected(parsed.status === "ONLINE");
        } catch (e) {
          console.warn("Failed to parse saved pairing device:", e);
        }
      }
    };
    loadSavedPairing().then(() => {
      initBackendSession();
    });
  }, []);

  // Heartbeat Scheduler
  useEffect(() => {
    if (connectionStatus !== "Connected") return;

    // Reset reconnect attempts on successful connection
    setReconnectAttempts(0);

    const interval = setInterval(async () => {
      try {
        let appVersion = "1.0.9";
        const storedVersion = await secureStore.get("appVersion");
        if (storedVersion) appVersion = storedVersion;

        await api.sendHeartbeat(appVersion);
        console.log("[Heartbeat] Active heartbeat sent.");
        
        // Refresh pairing status
        await checkActivePairing();
      } catch (err) {
        console.warn("[Heartbeat] Heartbeat failed, connection lost:", err);
        addLog("NET", "Heartbeat lost, network offline.");
        setConnectionStatus("Offline");
        clearInterval(interval);
        // Trigger reconnection
        initBackendSession();
      }
    }, 15000); // Send heartbeat every 15 seconds

    return () => clearInterval(interval);
  }, [connectionStatus]);

  // WebSocket Connection Manager Subscription
  useEffect(() => {
    const handleStateChange = (state: ConnectionState) => {
      setConnectionStatus(state);
      
      if (state === "Connected") {
        addLog("SYS", "Real-time bidirectional control channel established.");
      } else if (state === "Offline" || state === "Disconnected") {
        addLog("NET", "Real-time channel disconnected.");
      } else if (state === "Reconnecting") {
        addLog("SYS", "Real-time channel reconnecting...");
      } else if (state === "PairingRevoked") {
        addLog("ERR", "Pairing has been revoked. Re-pairing required.");
        setPairedDevice(null);
        setPartnerConnected(false);
        secureStore.remove("pairedDevice");
      }
    };

    const handleMessage = (msg: any) => {
      if (msg.type === "CONNECTION_STATUS") {
        setPartnerConnected(msg.payload.status === "CONNECTED");
        addLog("SYS", `Partner device status: ${msg.payload.status}`);
        fetchTargetTelemetry();
      } else if (msg.type === "LOCATION_UPDATE") {
        setTargetTelemetry((prev: any) => ({
          ...prev,
          latitude: msg.payload.latitude,
          longitude: msg.payload.longitude,
          accuracy: msg.payload.accuracy,
          source: msg.payload.source,
          timestamp: msg.timestamp,
          altitude: msg.payload.altitude,
          heading: msg.payload.heading,
          speed: msg.payload.speed,
        }));
        addLog("LOC", `Target location updated (Source: ${msg.payload.source})`);
      } else if (msg.type === "DEVICE_TELEMETRY") {
        setTargetTelemetry((prev: any) => ({
          ...prev,
          timestamp: msg.payload.timestamp,
          batteryLevel: msg.payload.battery?.level,
          isCharging: msg.payload.battery?.charging,
          networkType: msg.payload.network?.type,
          appVersion: msg.payload.appVersion,
          platform: msg.payload.platform,
          ...(msg.payload.location ? {
            latitude: msg.payload.location.latitude,
            longitude: msg.payload.location.longitude,
            accuracy: msg.payload.location.accuracy,
            source: msg.payload.location.source,
            altitude: msg.payload.location.altitude,
            heading: msg.payload.location.heading,
            speed: msg.payload.location.speed,
          } : {}),
        }));
        addLog("SYS", `Target telemetry: Battery ${msg.payload.battery?.level}%, Net ${msg.payload.network?.type}`);
      } else {
        addLog("SYS", `Remote Event: ${msg.type}`);
      }
    };

    connectionManager.subscribe(handleStateChange, handleMessage);
    return () => connectionManager.unsubscribe();
  }, [platform]);

  // Auto Update Checker Hook
  const { updateAvailable, updateInfo, isUpdating, executeUpdate, dismissUpdate } = useUpdateChecker();

  // State Management
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [deceptionActive, setDeceptionActive] = useState<boolean>(false);
  const [inFakeShutdown, setInFakeShutdown] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(42);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Alert Overlays
  const [sirenDetonated, setSirenDetonated] = useState<boolean>(false);

  // Device status variables
  const [partnerConnected, setPartnerConnected] = useState<boolean>(false);
  const phoneOnline = platform === "desktop" ? partnerConnected : false;
  const laptopOnline = platform === "mobile" ? partnerConnected : false;

  // Start/Stop local Telemetry Collection
  useEffect(() => {
    if (connectionStatus !== "Connected" || !deviceId) {
      telemetryCollector.stop();
      return;
    }

    telemetryCollector.start((telemetry) => {
      console.log("[App] Sending local telemetry:", telemetry);
      connectionManager.sendMessage("DEVICE_TELEMETRY", telemetry);

      if (telemetry.location) {
        setLocalCoords({
          lat: telemetry.location.latitude,
          lng: telemetry.location.longitude,
        });
      }
    });

    return () => {
      telemetryCollector.stop();
    };
  }, [connectionStatus, deviceId]);

  // Coordinates
  const laptopCoords = platform === "desktop"
    ? (localCoords || { lat: 37.7749, lng: -122.4194 })
    : (targetTelemetry && targetTelemetry.latitude && targetTelemetry.longitude
        ? { lat: targetTelemetry.latitude, lng: targetTelemetry.longitude }
        : { lat: 37.7749, lng: -122.4194 });

  const phoneCoords = platform === "mobile"
    ? (localCoords || { lat: 37.7753, lng: -122.4201 })
    : (targetTelemetry && targetTelemetry.latitude && targetTelemetry.longitude
        ? { lat: targetTelemetry.latitude, lng: targetTelemetry.longitude }
        : { lat: 37.7753, lng: -122.4201 });

  const batteryPhone = platform === "desktop"
    ? (targetTelemetry?.batteryLevel ?? 84)
    : 84;

  const batteryLaptop = platform === "mobile"
    ? (targetTelemetry?.batteryLevel ?? 100)
    : 100;

  // Compute proximity distance dynamically
  let proximityDistance = 12;
  const targetLat = targetTelemetry?.latitude;
  const targetLng = targetTelemetry?.longitude;
  const localLat = localCoords?.lat;
  const localLng = localCoords?.lng;
  if (typeof targetLat === "number" && typeof targetLng === "number" && typeof localLat === "number" && typeof localLng === "number") {
    const R = 6371e3; // meters
    const phi1 = (localLat * Math.PI) / 180;
    const phi2 = (targetLat * Math.PI) / 180;
    const deltaPhi = ((targetLat - localLat) * Math.PI) / 180;
    const deltaLambda = ((targetLng - localLng) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    proximityDistance = Math.round(R * c);
  }

  // Log simulation
  const [logs, setLogs] = useState<LogMessage[]>(PRE_SEEDED_LOGS);

  const addLog = (type: LogMessage["type"], message: string) => {
    const time = new Date().toISOString().split("T")[1].substring(0, 12) + "Z";
    setLogs((prev) => [...prev, { timestamp: time, type, message }]);
  };

  // Sync Action
  const triggerSync = async () => {
    setIsSyncing(true);
    addLog("SYS", "Synchronizing telemetry data...");
    try {
      await telemetryCollector.collectAndReport();
      await fetchTargetTelemetry();
      addLog("SYS", "Telemetry synchronization completed.");
    } catch (e: any) {
      addLog("ERR", "Telemetry sync failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Alarm Trigger Action
  const handleTriggerAlarm = () => {
    setSirenDetonated(true);
    addLog("ERR", "SIREN ALARM DETONATED remotely! Emitting high-frequency tone.");
    setTimeout(() => {
      setSirenDetonated(false);
    }, 4000);
  };

  // Deception Mode Action
  const handleToggleDeception = () => {
    setDeceptionActive((prev) => {
      const nextState = !prev;
      if (nextState) {
        addLog("SYS", "Deception mode armed. Sleep interception threads active.");
      } else {
        addLog("SYS", "Deception mode disarmed. Normal power routines restored.");
        setInFakeShutdown(false);
      }
      return nextState;
    });
  };

  // Device Erasure Action
  const handleWipeData = () => {
    addLog("ERR", "PARTITION CRYPTOGRAPHIC ERASE TRIGGERED. Storage modules offline.");
    alert("Simulation: Emergency wipe commands dispatched. Local files deleted.");
  };

  // Unpair Action
  const handleUnpairDevice = async () => {
    const confirm = window.confirm(`Are you sure you want to unpair the paired ${platform === "desktop" ? "mobile" : "laptop"} device?`);
    if (confirm) {
      try {
        await api.unpairDevice();
        setPairedDevice(null);
        setPartnerConnected(false);
        await secureStore.remove("pairedDevice");
        connectionManager.disconnect();
        addLog("SYS", "Device relationship unpaired successfully.");
        alert("Device unpaired successfully.");
      } catch (e: any) {
        console.error("Failed to unpair:", e);
        alert("Failed to unpair: " + (e.message || e));
      }
    }
  };



  // Auto updates telemetry simulation
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isLocked && !inFakeShutdown) {
        setLatency((prev) => Math.max(15, Math.min(250, prev + Math.floor(Math.random() * 8 - 4))));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isLocked, inFakeShutdown]);

  return (
    <div className="h-screen w-screen flex flex-col font-sans relative antialiased overflow-hidden bg-slate-50">
      {/* 1. Custom Desktop Frameless Titlebar */}
      {platform === "desktop" && <Titlebar connectionStatus={connectionStatus} />}

      {/* 2. Auto Update Notification Banner */}
      {updateAvailable && updateInfo && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between text-xs text-blue-700 animate-slide-in select-none z-40 relative">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">UPDATE</span>
            <span className="font-semibold">New version v{updateInfo.version} is available!</span>
            <span className="hidden lg:inline opacity-80">— {updateInfo.body}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={executeUpdate}
              disabled={isUpdating}
              className="bg-blue-600 text-white font-bold px-3 py-1 rounded hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 text-[10px] border-0"
            >
              {isUpdating ? "Updating..." : "Update Now"}
            </button>
            <button
              onClick={dismissUpdate}
              className="text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}



      {/* 4. Fullscreen Siren Detonated Alarm Overlay */}
      {sirenDetonated && (
        <div className="fixed inset-0 z-50 bg-red-600/35 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-pulse">
          <div className="bg-red-600 text-white px-8 py-6 rounded-2xl shadow-2xl border border-white/20 text-center space-y-3 pointer-events-auto">
            <Volume2 className="w-12 h-12 animate-bounce mx-auto" />
            <h2 className="font-extrabold text-xl tracking-widest uppercase font-sans">AUDIBLE SIREN DETONATED</h2>
            <p className="text-xs text-white/95 leading-relaxed max-w-xs">Acoustic deterrent signal emitted on target device.</p>
            <button
              onClick={() => setSirenDetonated(false)}
              className="mt-2 bg-white text-red-600 font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border-0 shadow"
            >
              Mute Alarm
            </button>
          </div>
        </div>
      )}

      {/* 5. Fake Shutdown Deception Mode Overlay */}
      {inFakeShutdown && (
        <div 
          className="fixed inset-0 bg-[#020205] text-slate-800 z-50 flex flex-col items-center justify-center cursor-none select-none transition-all duration-700"
          title="Host OS screen blacked out"
        >
          <div className="absolute top-4 right-4 text-[10px] text-zinc-900 bg-zinc-950 px-3 py-1 rounded border border-zinc-900 cursor-pointer select-none font-mono flex items-center gap-2 pointer-events-auto"
               onClick={() => {
                 setInFakeShutdown(false);
                 addLog("SYS", "Lid close intercept simulation disarmed.");
               }}>
            <span>[Simulation Bypass] Click to Open Lid</span>
            <X className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* 6. Dashboard Content Canvas */}
      <div className="flex-grow flex overflow-hidden w-full h-full relative">
        {isLocked ? (
          <EmergencyLockView
            onUnlock={() => setIsLocked(false)}
            onPlayAlarm={handleTriggerAlarm}
            onWipeData={handleWipeData}
          />
        ) : platform === "desktop" ? (
          <DesktopDashboard
            phoneOnline={phoneOnline}
            batteryPhone={batteryPhone}
            laptopCoords={laptopCoords}
            phoneCoords={phoneCoords}
            proximityDistance={proximityDistance}
            isSyncing={isSyncing}
            triggerSync={triggerSync}
            onTriggerAlarm={handleTriggerAlarm}
            onRemoteLock={() => setIsLocked(true)}
            onUnpairDevice={handleUnpairDevice}
            connectionStatus={connectionStatus}
            pairedDevice={pairedDevice}
            pairingRequest={pairingRequest}
            setPairingRequest={setPairingRequest}
            targetTelemetry={targetTelemetry}
          />
        ) : (
          <MobileDashboard
            laptopOnline={laptopOnline}
            batteryLaptop={batteryLaptop}
            laptopCoords={laptopCoords}
            phoneCoords={phoneCoords}
            proximityDistance={proximityDistance}
            isSyncing={isSyncing}
            triggerSync={triggerSync}
            onTriggerAlarm={handleTriggerAlarm}
            onRemoteLock={() => setIsLocked(true)}
            deceptionActive={deceptionActive}
            onToggleDeception={handleToggleDeception}
            connectionStatus={connectionStatus}
            pairedDevice={pairedDevice}
            onUnpairDevice={handleUnpairDevice}
            checkActivePairing={checkActivePairing}
            targetTelemetry={targetTelemetry}
          />
        )}
      </div>
    </div>
  );
}

export default App;
