import { useState, useEffect } from "react";
import { Titlebar } from "./components/Titlebar";
import { DesktopDashboard } from "./views/DesktopDashboard";
import { MobileDashboard } from "./views/MobileDashboard";
import { EmergencyLockView } from "./views/EmergencyLockView";
import { useUpdateChecker } from "./hooks/useUpdateChecker";
import { getAppPlatform } from "./utils/platform";

// Icons
import {
  Volume2,
  Power,
  X,
  Smartphone,
  Download
} from "lucide-react";

interface LogMessage {
  timestamp: string;
  type: "SYS" | "LOC" | "NET" | "ERR" | "WARN";
  message: string;
}

const PRE_SEEDED_LOGS: LogMessage[] = [
  { timestamp: "14:02:11.004Z", type: "SYS", message: "Guardian Client pairing channel open." },
  { timestamp: "14:02:11.230Z", type: "SYS", message: "Mutual connection handshake successful with node SG-MOB-442 (Nexus-9)." },
  { timestamp: "14:02:12.115Z", type: "LOC", message: "LAT: 37.7749 N, LON: -122.4194 W (GPS Triangulation - Acc: 4.2m)" },
  { timestamp: "14:02:45.302Z", type: "NET", message: "Secondary link established via BLE Mesh network. 3 nearby relay nodes visible." },
  { timestamp: "14:03:01.881Z", type: "SYS", message: "Continuous heartbeat verify. Cryptographic link PASS (Curve25519)." },
];

function App() {
  // Platform Detection
  const [platform, setPlatform] = useState<"desktop" | "mobile">(getAppPlatform());

  useEffect(() => {
    const handleResize = () => {
      setPlatform(getAppPlatform());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(true); // PWA simulated visibility

  // Device status variables
  const [batteryLaptop, setBatteryLaptop] = useState<number>(100);
  const [batteryPhone, setBatteryPhone] = useState<number>(84);
  const [laptopOnline] = useState<boolean>(true);
  const [phoneOnline] = useState<boolean>(true);

  // Coordinates
  const laptopCoords = { lat: 37.7749, lng: -122.4194 };
  const phoneCoords = { lat: 37.7753, lng: -122.4201 };
  const [proximityDistance, setProximityDistance] = useState<number>(12);

  // Log simulation
  const [logs, setLogs] = useState<LogMessage[]>(PRE_SEEDED_LOGS);

  const addLog = (type: LogMessage["type"], message: string) => {
    const time = new Date().toISOString().split("T")[1].substring(0, 12) + "Z";
    setLogs((prev) => [...prev, { timestamp: time, type, message }]);
  };

  // Sync Action
  const triggerSync = () => {
    setIsSyncing(true);
    setLatency((prev) => Math.max(10, Math.floor(prev + (Math.random() * 20 - 10))));
    setTimeout(() => {
      setIsSyncing(false);
      addLog("SYS", "Dynamic pairing tokens renewed. Cipher status: OK.");
      setBatteryPhone((prev) => Math.max(1, prev - 1));
      setBatteryLaptop((prev) => Math.max(1, prev === 100 ? 100 : prev - 1));
      setProximityDistance((prev) => Math.max(4, prev + Math.floor(Math.random() * 6 - 3)));
    }, 1200);
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
  const handleUnpairDevice = () => {
    const confirm = window.confirm("Are you sure you want to unpair the Nexus-9 mobile device?");
    if (confirm) {
      alert("Device unpaired successfully.");
      addLog("SYS", "Nexus-9 Mobile node unpaired.");
    }
  };

  // PWA Install Action
  const handleInstallApp = () => {
    alert("Installing OmniRecover on your mobile Home Screen...\nApp icon added successfully! Boom.");
    addLog("SYS", "PWA installation simulation success.");
    setShowInstallBtn(false);
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
      {platform === "desktop" && <Titlebar />}

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

      {/* 3. Mobile PWA Install Banner (Renders only on Mobile) */}
      {platform === "mobile" && showInstallBtn && (
        <div className="bg-slate-100 text-slate-700 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] select-none z-40 relative animate-slide-in">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold leading-tight">Add OmniRecover to your Home Screen</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallApp}
              className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded hover:bg-blue-700 transition-colors cursor-pointer text-[9px] border-0"
            >
              Add Icon
            </button>
            <a
              href="https://github.com/ahmad-dev2989/device-tracker/releases/download/v1.0.0/app-debug.apk"
              download
              className="bg-slate-800 text-white font-bold px-2.5 py-1 rounded hover:bg-slate-900 transition-colors text-[9px] text-center inline-flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" />
              APK
            </a>
            <button
              onClick={() => setShowInstallBtn(false)}
              className="text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X className="w-3 h-3" />
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
          />
        )}
      </div>
    </div>
  );
}

export default App;
