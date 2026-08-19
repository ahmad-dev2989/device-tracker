import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { BottomNavBar } from "./components/BottomNavBar";
import { TelemetryOverlay } from "./components/TelemetryOverlay";
import { RadarMap } from "./components/RadarMap";
import { LogsPanel } from "./components/LogsPanel";
import { SimulatorControl } from "./components/SimulatorControl";
import { Titlebar } from "./components/Titlebar";
import { useUpdateChecker } from "./hooks/useUpdateChecker";

// Views
import { DashboardView } from "./views/DashboardView";
import { RemoteCommandsView } from "./views/RemoteCommandsView";
import { SecuritySettings } from "./views/SecuritySettings";
import { EmergencyLockView } from "./views/EmergencyLockView";

// Icons
import {
  Bell,
  Search,
  AlertOctagon,
  User,
  Shield,
  Laptop,
  Smartphone,
  Info,
  Power,
  RotateCcw,
  Volume2,
  Lock as LockIcon,
  HelpCircle,
  Settings,
  X,
  Camera
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
  { timestamp: "14:03:01.881Z", type: "SYS", message: "Continuous heartbeat verify. Cryptographic link PASS (verified Curve25519)." },
];

const PRE_SEEDED_SNAPS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuClLqrlYP9E_E98flUL4_uXzERSB0wFELRvesOARpWBPpKyTdglivW45wVXcqxehDqOlpgQOtt2MXuLfoKs6t4KH2UfqgMx8BGDha1eb2eVWm8WqqV9bpJ0zDjjSBiU01SixVCz4JsZWW7I4QAvXlAToN1gkR_lTsONXWfsSyC51g_cHu--XXvcp8v2QsjwFWPiZexE608H8ywf0RYnbZThGsAF_3R3Ys8QMKXPJVovJL2cSoE6C7BGDg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAdPQwaSuPHLdxdkvtNJqS7sun38sLeTADtS7U0wPGk3fbOpHgcjbQBcsM-WN6rNo9VwzBperUCP8NPqJk7pZebDTmSZF_ADSy_HfcOQPxOz397uo2Zt6U50LZx6oWRttR7w1DcdIKjOYBNDLHhZWJki-cTzrzYT2Xpe3UTzAzve_MRM6av9DchdUrUa-L1aW3iafESt0w1DymwoelWB96KtzZ7X8iveP8X8KZ_sz_GgogV9hV9gZwWQw"
];

function App() {
  // Auto Update Checker
  const { updateAvailable, updateInfo, isUpdating, executeUpdate, dismissUpdate } = useUpdateChecker();

  // Global simulated state
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [layoutMode, setLayoutMode] = useState<"desktop" | "mobile" | "fluid">("fluid");
  const [targetDevice, setTargetDevice] = useState<"laptop" | "phone">("laptop");
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [deceptionActive, setDeceptionActive] = useState<boolean>(false);
  const [inFakeShutdown, setInFakeShutdown] = useState<boolean>(false);
  const [bleMeshEnabled, setBleMeshEnabled] = useState<boolean>(true);
  const [latency, setLatency] = useState<number>(42);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Alert State overlays
  const [sirenDetonated, setSirenDetonated] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(3);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);

  // Device specs
  const [batteryLaptop, setBatteryLaptop] = useState<number>(100);
  const [batteryPhone, setBatteryPhone] = useState<number>(84);
  const [laptopOnline, setLaptopOnline] = useState<boolean>(true);
  const [phoneOnline, setPhoneOnline] = useState<boolean>(true);

  // Lists
  const [logs, setLogs] = useState<LogMessage[]>(PRE_SEEDED_LOGS);
  const [cameraSnaps, setCameraSnaps] = useState<string[]>(PRE_SEEDED_SNAPS);

  // Proximity details
  const [laptopCoords] = useState({ lat: 37.7749, lng: -122.4194 });
  const [phoneCoords] = useState({ lat: 37.7753, lng: -122.4201 });
  const [proximityDistance, setProximityDistance] = useState<number>(12);

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(true); // Pre-seeded true for simulation visibility

  useEffect(() => {
    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
      addLog("SYS", "Mobile browser PWA installation trigger received.");
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    window.addEventListener("appinstalled", () => {
      addLog("SYS", "OmniRecover PWA client successfully installed.");
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install prompt user choice: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    } else {
      // Browser Simulation fallback
      alert("Installing OmniRecover on your mobile Home Screen...\nApp icon added successfully! Boom.");
      addLog("SYS", "PWA installation simulation success.");
      setShowInstallBtn(false);
    }
  };

  // Log simulation updates
  const addLog = (type: LogMessage["type"], message: string) => {
    const time = new Date().toISOString().split("T")[1].substring(0, 12) + "Z";
    setLogs((prev) => [...prev, { timestamp: time, type, message }]);
  };

  // Sync animation
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

  // Alarm Trigger
  const handleTriggerAlarm = () => {
    setSirenDetonated(true);
    addLog("ERR", "SIREN ALARM DETONATED remotely! Emitting high-frequency detering tone.");
    // Simulate auto timeout
    setTimeout(() => {
      setSirenDetonated(false);
    }, 4000);
  };

  // Secure Lock
  const handleExecuteLock = (password: string) => {
    setIsLocked((prev) => {
      const nextState = !prev;
      if (nextState) {
        addLog("WARN", `Secure lock command executed. Input password hash verified.`);
        // Force view to map/lock screen view
        setActiveView("map");
      } else {
        addLog("SYS", "Secure lock disarmed. OS session decrypted successfully.");
      }
      return nextState;
    });
  };

  // Deception mode toggled
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

  // Force Webcam Snapshot
  const handleForceCameraCapture = () => {
    addLog("SYS", "Webcam shutter triggered. Resolving image sensor byte stream.");
    // Random corporate abstract visual mockup
    const randomSnap =
      cameraSnaps.length % 2 === 0
        ? "https://lh3.googleusercontent.com/aida-public/AB6AXuClLqrlYP9E_E98flUL4_uXzERSB0wFELRvesOARpWBPpKyTdglivW45wVXcqxehDqOlpgQOtt2MXuLfoKs6t4KH2UfqgMx8BGDha1eb2eVWm8WqqV9bpJ0zDjjSBiU01SixVCz4JsZWW7I4QAvXlAToN1gkR_lTsONXWfsSyC51g_cHu--XXvcp8v2QsjwFWPiZexE608H8ywf0RYnbZThGsAF_3R3Ys8QMKXPJVovJL2cSoE6C7BGDg"
        : "https://lh3.googleusercontent.com/aida-public/AB6AXuAdPQwaSuPHLdxdkvtNJqS7sun38sLeTADtS7U0wPGk3fbOpHgcjbQBcsM-WN6rNo9VwzBperUCP8NPqJk7pZebDTmSZF_ADSy_HfcOQPxOz397uo2Zt6U50LZx6oWRttR7w1DcdIKjOYBNDLHhZWJki-cTzrzYT2Xpe3UTzAzve_MRM6av9DchdUrUa-L1aW3iafESt0w1DymwoelWB96KtzZ7X8iveP8X8KZ_sz_GgogV9hV9gZwWQw";
    
    setTimeout(() => {
      setCameraSnaps((prev) => [randomSnap, ...prev]);
      addLog("SYS", "Frontal webcam snapshot successfully uploaded to Sentinel core storage.");
    }, 800);
  };

  // Wipe data
  const handleWipeData = () => {
    addLog("ERR", "PARTITION CRYPTOGRAPHIC ERASE TRIGGERED. Storage modules offline.");
    alert("Simulation: Emergency wipe commands dispatched. Local files deleted.");
  };

  // Toggle BLE Mesh
  const handleToggleBleMesh = () => {
    setBleMeshEnabled((prev) => {
      const next = !prev;
      addLog("SYS", `Offline BLE Mesh Network ${next ? "ENABLED" : "DISABLED"}.`);
      return next;
    });
  };

  // Update password logic
  const handleUpdatePassword = (cur: string, next: string) => {
    addLog("SYS", "Master cryptographic credentials changed. Key anchors rotated.");
  };

  // Auto updates telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isLocked && !inFakeShutdown) {
        // Sim static updates
        setLatency((prev) => Math.max(15, Math.min(250, prev + Math.floor(Math.random() * 8 - 4))));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isLocked, inFakeShutdown]);

  // Determine current screen view helper
  const renderSelectedView = () => {
    if (isLocked) {
      return (
        <EmergencyLockView
          onUnlock={() => setIsLocked(false)}
          onPlayAlarm={handleTriggerAlarm}
          onWipeData={handleWipeData}
          phoneOnline={phoneOnline}
          laptopOnline={laptopOnline}
          logs={logs}
        />
      );
    }

    switch (activeView) {
      case "dashboard":
        return (
          <DashboardView
            onTriggerAlarm={handleTriggerAlarm}
            onRemoteLock={() => setIsLocked(true)}
            onToggleDeception={handleToggleDeception}
            deceptionActive={deceptionActive}
            batteryLaptop={batteryLaptop}
            batteryPhone={batteryPhone}
            phoneOnline={phoneOnline}
            laptopOnline={laptopOnline}
            onPingDevice={(dev) => addLog("SYS", `Manual sync ping dispatched to ${dev}.`)}
          />
        );
      case "map":
        return (
          <div className="flex-1 flex flex-col h-full min-h-[400px] relative">
            <div className="flex-1 relative rounded-xl overflow-hidden border border-outline-variant/60 shadow-sm flex flex-col md:flex-row">
              <RadarMap
                layoutMode={layoutMode}
                targetDevice={targetDevice}
                setTargetDevice={setTargetDevice}
                laptopCoords={laptopCoords}
                phoneCoords={phoneCoords}
                laptopOnline={laptopOnline}
                phoneOnline={phoneOnline}
                proximityDistance={proximityDistance}
              />
              
              {/* Telemetry panel (Desktop/Fluid sidebar overlays) */}
              <div className="md:absolute top-4 right-4 z-20 shrink-0 shadow-lg">
                <TelemetryOverlay
                  deviceName={targetDevice === "laptop" ? "Alpha-Book Pro" : "Nexus-9"}
                  isOnline={targetDevice === "laptop" ? laptopOnline : phoneOnline}
                  latitude={targetDevice === "laptop" ? laptopCoords.lat : phoneCoords.lat}
                  longitude={targetDevice === "laptop" ? laptopCoords.lng : phoneCoords.lng}
                  accuracy={targetDevice === "laptop" ? 4.2 : 9.5}
                  ipAddress={targetDevice === "laptop" ? "192.168.1.104" : "10.0.8.21"}
                  wifiSsid={targetDevice === "laptop" ? "Corporate_Net_5G" : "MobileEmergency_P2P"}
                  bleNodes={bleMeshEnabled ? 3 : 0}
                  batteryLevel={targetDevice === "laptop" ? batteryLaptop : batteryPhone}
                />
              </div>
            </div>
            
            {/* Quick Actions Row */}
            <div className="mt-4 bg-surface border border-outline-variant rounded-full px-6 py-3 shadow-sm flex items-center justify-between gap-6 overflow-x-auto text-xs select-none">
              <div className="font-bold text-[10px] uppercase tracking-wider text-outline shrink-0">
                Action Overrides
              </div>
              <div className="w-px h-6 bg-outline-variant shrink-0"></div>
              <div className="flex gap-6 items-center shrink-0">
                <button
                  onClick={handleForceCameraCapture}
                  className="flex items-center gap-2 text-primary hover:text-primary-container transition-colors cursor-pointer font-bold"
                >
                  <Camera className="w-4 h-4 fill-primary/5" />
                  <span>Silent Snapshot</span>
                </button>
                <button
                  onClick={handleTriggerAlarm}
                  className="flex items-center gap-2 text-error hover:text-opacity-80 transition-colors cursor-pointer font-bold"
                >
                  <Volume2 className="w-4 h-4 fill-error/5" />
                  <span>Audible Siren</span>
                </button>
                {deceptionActive && (
                  <button
                    onClick={() => setInFakeShutdown(true)}
                    className="flex items-center gap-2 text-primary-container bg-primary px-3 py-1 rounded-full hover:bg-opacity-95 transition-all cursor-pointer font-bold text-[10px]"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Lid Close Simulation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case "commands":
        return (
          <RemoteCommandsView
            onTriggerAlarm={handleTriggerAlarm}
            onExecuteLock={() => setIsLocked(true)}
            deceptionActive={deceptionActive}
            onToggleDeception={handleToggleDeception}
            onForceCameraCapture={handleForceCameraCapture}
            cameraSnaps={cameraSnaps}
            isLocked={isLocked}
          />
        );
      case "security":
        return (
          <SecuritySettings
            onUpdatePassword={handleUpdatePassword}
            bleMeshEnabled={bleMeshEnabled}
            onToggleBleMesh={handleToggleBleMesh}
          />
        );
      case "settings":
      case "support":
        return (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center space-y-4 max-w-md mx-auto mt-12 animate-fade-in shadow-sm">
            <HelpCircle className="w-12 h-12 text-primary mx-auto" />
            <h2 className="font-bold text-lg text-on-surface">Settings &amp; Documentation</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              OmniRecover utilizes low-level Tauri Rust APIs on Linux/Windows hosts, combined with local Bluetooth beacon handshakes on Android targets, maintaining active locations mesh routing even under physical lid sleep interrupts.
            </p>
            <div className="pt-4 border-t border-outline-variant flex justify-center gap-4 text-xs font-bold uppercase tracking-wider">
              <button onClick={() => setActiveView("dashboard")} className="text-primary hover:underline">
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      default:
        return <div>View unresolved. Check router state.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative antialiased">
      {/* 0. Custom Frameless Titlebar Window controls */}
      <Titlebar />

      {/* 1. Design Simulator Control Center */}
      <SimulatorControl
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        targetDevice={targetDevice}
        setTargetDevice={setTargetDevice}
        latency={latency}
        triggerSync={triggerSync}
        isSyncing={isSyncing}
      />

      {/* 1.5 Auto Update Banner Notification */}
      {updateAvailable && updateInfo && (
        <div className="bg-primary/10 border-b border-primary/20 px-gutter py-2.5 flex items-center justify-between text-xs text-primary animate-slide-in select-none z-40">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-on-primary font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">UPDATE</span>
            <span className="font-semibold">New version v{updateInfo.version} is available!</span>
            <span className="hidden lg:inline opacity-80">— {updateInfo.body}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={executeUpdate}
              disabled={isUpdating}
              className="bg-primary text-on-primary font-bold px-3 py-1 rounded hover:bg-on-primary-fixed-variant transition-colors cursor-pointer disabled:opacity-50 text-[10px]"
            >
              {isUpdating ? "Updating..." : "Update Now"}
            </button>
            <button
              onClick={dismissUpdate}
              className="text-on-surface-variant hover:text-on-surface p-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1.6 PWA Mobile Install Banner */}
      {showInstallBtn && (
        <div className="bg-secondary-container text-on-secondary-container border-b border-outline-variant px-gutter py-2.5 flex items-center justify-between text-xs select-none z-40 animate-slide-in">
          <div className="flex items-center gap-2">
            <span className="bg-secondary text-on-secondary font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">PWA INSTALL</span>
            <span className="font-semibold">Add OmniRecover to your mobile Home Screen for a native standalone app experience!</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallApp}
              className="bg-secondary text-on-secondary font-bold px-3 py-1 rounded hover:bg-opacity-95 transition-colors cursor-pointer text-[10px]"
            >
              Add Icon
            </button>
            <a
              href="https://github.com/ahmad-dev2989/device-tracker/releases/download/v1.0.0/app-debug.apk"
              download
              className="bg-primary text-on-primary font-bold px-3 py-1 rounded hover:bg-opacity-95 transition-all text-[10px] text-center inline-block"
            >
              Download APK
            </a>
            <button
              onClick={() => setShowInstallBtn(false)}
              className="text-on-surface-variant hover:text-on-surface p-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Siren Blast Alert overlay banner */}
      {sirenDetonated && (
        <div className="fixed inset-0 z-50 bg-error/40 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-pulse">
          <div className="bg-error text-on-error px-8 py-6 rounded-2xl shadow-2xl border-2 border-white/20 text-center space-y-3 pointer-events-auto">
            <Volume2 className="w-16 h-16 animate-bounce mx-auto" />
            <h2 className="font-extrabold text-2xl tracking-widest uppercase">AUDIBLE SIREN DETONATED</h2>
            <p className="text-sm text-white/90">Remote deterrent acoustic signal blasting on target host speaker partitions...</p>
            <button
              onClick={() => setSirenDetonated(false)}
              className="mt-2 bg-white text-error font-bold text-xs px-4 py-2 rounded-lg hover:bg-opacity-95 transition-all cursor-pointer"
            >
              Mute Alarm Deterrent
            </button>
          </div>
        </div>
      )}

      {/* 3. Fake Shutdown Deception mode Simulator Overlay */}
      {inFakeShutdown && (
        <div 
          className="fixed inset-0 bg-[#020205] text-slate-800 z-50 flex flex-col items-center justify-center cursor-none select-none transition-all duration-700"
          title="Host OS screen blacked out"
        >
          {/* Simulated completely dead screen */}
          <div className="absolute top-4 right-4 text-[10px] text-zinc-900 bg-zinc-950 px-3 py-1 rounded border border-zinc-900 cursor-pointer select-none font-mono flex items-center gap-2 pointer-events-auto"
               onClick={() => {
                 setInFakeShutdown(false);
                 addLog("SYS", "Lid close intercept simulation disarmed via debug bypass.");
               }}>
            <span>[Simulation Debug Mode] Click to open lid</span>
            <X className="w-3.5 h-3.5" />
          </div>
          
          <div className="text-center font-mono space-y-1.5 opacity-5 select-none pointer-events-none">
            <p className="font-bold text-xs uppercase">Guardian System Deception state</p>
            <p className="text-[10px]">Telemetry active. Screen lock applied. Core power loop intercepted.</p>
          </div>
        </div>
      )}

      {/* 4. Notification Center Modal */}
      {showNotificationCenter && (
        <div className="absolute top-16 right-gutter z-50 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-4 animate-fade-in text-left text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant mb-3 select-none">
            <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">Sentinel Alerts</span>
            <button onClick={() => setShowNotificationCenter(false)} className="text-outline hover:text-on-surface">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-surface-container-low rounded border-l-2 border-secondary">
              <p className="font-semibold text-on-surface">Handshake active</p>
              <p className="text-[9px] text-on-surface-variant font-mono">Curve25519 pairing verified • Just now</p>
            </div>
            <div className="p-2 bg-surface-container-low rounded border-l-2 border-primary">
              <p className="font-semibold text-on-surface">BLE beacon mesh updated</p>
              <p className="text-[9px] text-on-surface-variant font-mono">Located 3 offline peers • 12m ago</p>
            </div>
            <div className="p-2 bg-surface-container-low rounded border-l-2 border-error">
              <p className="font-semibold text-on-surface">Threat Log Warning</p>
              <p className="text-[9px] text-on-surface-variant font-mono">Unknown device connection attempt rejected • 1h ago</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNotificationsCount(0);
              setShowNotificationCenter(false);
            }}
            className="w-full text-center mt-3 pt-2 border-t border-outline-variant font-semibold text-primary hover:underline"
          >
            Mark all read
          </button>
        </div>
      )}

      {/* 5. Main Screen Render Container based on layoutMode */}
      <div className="flex-1 flex overflow-hidden">
        {/* Render Layout Mode check */}
        {layoutMode === "desktop" || (layoutMode === "fluid" && window.innerWidth >= 768) ? (
          /* Desktop Two-Pane layout */
          <div className="flex-1 flex overflow-hidden h-full">
            {/* Sidebar Navigation */}
            <Sidebar
              activeView={activeView}
              setActiveView={setActiveView}
              onEmergencyLock={() => setIsLocked(!isLocked)}
              isLocked={isLocked}
            />

            {/* Content pane */}
            <div className="flex-grow flex flex-col relative w-full h-full min-w-0">
              
              {/* Desktop Header */}
              <header className="bg-surface border-b border-outline-variant h-16 flex items-center justify-between px-gutter select-none z-10">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-primary tracking-tight">OmniRecover</div>
                  
                  {/* Search bar wrapper */}
                  <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1 border border-outline-variant text-xs">
                    <Search className="w-4 h-4 text-outline mr-2 shrink-0" />
                    <input
                      type="text"
                      className="bg-transparent border-none focus:outline-none w-64 text-on-surface placeholder:text-outline-variant"
                      placeholder="Search recovery logs, beacons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                    className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative"
                    title="Alert System center"
                  >
                    <Bell className="w-5 h-5 text-outline" />
                    {notificationsCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-bounce"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsLocked(true)}
                    className="p-2 text-error hover:bg-error-container rounded-full transition-colors"
                    title="Initiate Lockdown mode"
                  >
                    <AlertOctagon className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-outline-variant mx-1"></div>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors text-xs font-semibold text-on-surface-variant">
                    <User className="w-4.5 h-4.5 text-outline" />
                    <span className="hidden md:inline">Admin Node</span>
                  </button>
                </div>
              </header>

              {/* View Canvas scrolling */}
              <main className="flex-1 overflow-y-auto p-gutter bg-background relative h-full">
                <div className="max-w-container-max mx-auto h-full flex flex-col">
                  {renderSelectedView()}
                  
                  {/* Shared bottom-docked terminal logs snippet */}
                  {!isLocked && activeView !== "map" && (
                    <div className="mt-8">
                      <LogsPanel logs={logs} onClearLogs={() => setLogs(PRE_SEEDED_LOGS)} />
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        ) : (
          /* Mobile View framing */
          <div className="flex-grow flex items-center justify-center bg-zinc-900/10 dark:bg-zinc-950 p-2 md:p-8 overflow-y-auto">
            {/* iPhone mockup shell wrapper */}
            <div className="relative w-full max-w-[380px] h-[780px] bg-white rounded-[40px] shadow-[0_0_40px_rgba(0,0,0,0.15)] border-[12px] border-zinc-800 flex flex-col overflow-hidden text-xs">
              
              {/* Speaker Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                <div className="w-12 h-1 bg-zinc-700 rounded-full mb-1.5"></div>
              </div>

              {/* Mobile app header */}
              <header className="bg-surface border-b border-outline-variant h-14 shrink-0 flex items-center justify-between px-4 pt-4 select-none z-30">
                <div className="flex items-center gap-1">
                  <Shield className="w-4.5 h-4.5 text-primary fill-primary/10" />
                  <span className="font-bold text-[13px] text-primary">Shield Guardian</span>
                </div>
                <button
                  onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                  className="p-1 hover:bg-surface-container rounded-full relative"
                >
                  <Bell className="w-4 h-4 text-outline" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-error rounded-full"></span>
                  )}
                </button>
              </header>

              {/* Mobile app body content container */}
              <main className="flex-1 overflow-y-auto p-4 bg-background relative pb-20 select-none">
                {renderSelectedView()}
                
                {/* Mobile log snippet display */}
                {!isLocked && activeView !== "map" && (
                  <div className="mt-6">
                    <LogsPanel logs={logs} onClearLogs={() => setLogs(PRE_SEEDED_LOGS)} />
                  </div>
                )}
              </main>

              {/* Bottom Navigation */}
              <BottomNavBar
                activeView={activeView}
                setActiveView={setActiveView}
                onEmergencyLock={() => setIsLocked(!isLocked)}
                isLocked={isLocked}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
