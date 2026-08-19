import React, { useState } from "react";
import {
  Volume2,
  Lock,
  EyeOff,
  Camera,
  Wifi,
  ChevronRight,
  ShieldAlert,
  Play,
  Grid,
  Radio,
  RefreshCw,
  Sparkles
} from "lucide-react";

interface RemoteCommandsViewProps {
  onTriggerAlarm: () => void;
  onExecuteLock: (password: string) => void;
  deceptionActive: boolean;
  onToggleDeception: () => void;
  onForceCameraCapture: () => void;
  cameraSnaps: string[];
  isLocked: boolean;
}

export const RemoteCommandsView: React.FC<RemoteCommandsViewProps> = ({
  onTriggerAlarm,
  onExecuteLock,
  deceptionActive,
  onToggleDeception,
  onForceCameraCapture,
  cameraSnaps,
  isLocked,
}) => {
  const [alarmVolume, setAlarmVolume] = useState(100);
  const [passwordInput, setPasswordInput] = useState("••••••••");
  const [lidIntercept, setLidIntercept] = useState(true);
  const [fakeDisplayOff, setFakeDisplayOff] = useState(true);

  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const handlePlayAlarm = () => {
    setIsAlarmPlaying(true);
    onTriggerAlarm();
    setTimeout(() => {
      setIsAlarmPlaying(false);
    }, 4000);
  };

  const handleExecuteLockLocal = () => {
    onExecuteLock(passwordInput);
  };

  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      {/* Header Info Banner */}
      <header className="pb-stack-md border-b border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface">Hardware Controls</h1>
          <p className="text-xs text-on-surface-variant mt-2 flex flex-wrap items-center gap-2">
            <span>Target Hardware Node:</span>
            <span className="font-mono bg-surface-container px-2 py-0.5 rounded text-primary font-bold">
              MAC-B7:44:90
            </span>
            <span className="inline-flex items-center gap-1 bg-surface-container-low border border-outline-variant px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              SECURE LINK ACTIVE
            </span>
          </p>
        </div>
        <div className="text-left md:text-right font-mono text-[10px] text-outline">
          <div>UPLINK LATENCY: 42ms</div>
          <div>AES-256 ENCRYPTED CHANNEL</div>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md pb-12">
        
        {/* Card 1: Audible Alarm Deterrent */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col hover:border-primary transition-colors group relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
              <Volume2 className="w-6 h-6" />
            </div>
            <span className="px-2 py-1 rounded bg-surface border border-outline-variant text-[10px] font-mono text-outline font-bold">
              {isAlarmPlaying ? "SIREN ACTIVE" : "STATUS: STANDBY"}
            </span>
          </div>
          
          <h3 className="font-bold text-base text-on-surface mb-1">Audible Alarm</h3>
          <p className="text-xs text-on-surface-variant mb-6 flex-1">
            Trigger maximum-volume deterrent siren on host hardware speaker output.
          </p>
          
          <div className="mt-auto space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-outline font-mono">MIN</span>
              <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alarmVolume}
                  onChange={(e) => setAlarmVolume(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div
                  className="absolute top-0 left-0 h-full bg-primary"
                  style={{ width: `${alarmVolume}%` }}
                ></div>
                {/* Visual indicator lines */}
                <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-px h-full bg-surface-container-lowest opacity-40"></div>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-outline font-mono">{alarmVolume}%</span>
            </div>
            
            <button
              onClick={handlePlayAlarm}
              disabled={isAlarmPlaying}
              className={`w-full py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex justify-center items-center gap-2 border transition-all cursor-pointer ${
                isAlarmPlaying
                  ? "bg-error text-on-error border-error animate-pulse"
                  : "bg-surface text-primary border-primary hover:bg-primary-container"
              }`}
            >
              {isAlarmPlaying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Blasting Siren...
                </>
              ) : (
                <>
                  <Play className="w-4.5 h-4.5 fill-primary/10" />
                  Trigger Deterrent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Secure Session Lock */}
        <div className={`bg-surface-container-lowest rounded-xl p-stack-md flex flex-col relative overflow-hidden transition-all border ${
          isLocked 
            ? "border-secondary shadow-[0_0_15px_rgba(0,108,72,0.1)]" 
            : "border-error shadow-[0_0_15px_rgba(186,26,26,0.08)]"
        }`}>
          <div className="absolute top-0 right-0 w-16 h-16 bg-error-container rounded-bl-full opacity-30"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isLocked ? "bg-secondary-container text-on-secondary-container" : "bg-error-container text-error"
            }`}>
              <Lock className="w-6 h-6" />
            </div>
            <span className="px-2 py-1 rounded bg-surface border border-outline-variant text-[10px] font-mono text-outline font-bold">
              {isLocked ? "LOCK APPLIED" : "STATUS: OPEN"}
            </span>
          </div>

          <h3 className="font-bold text-base text-on-surface mb-1 relative z-10">Secure Lock</h3>
          <p className="text-xs text-on-surface-variant mb-6 flex-1 relative z-10">
            Suspend active OS session, wipe login cache, and lock interface.
          </p>

          <div className="mt-auto relative z-10 space-y-3">
            <div className="relative">
              <input
                type="password"
                className="w-full bg-surface border border-outline-variant rounded-lg py-2 pl-3 pr-8 text-xs font-mono focus:border-error focus:ring-1 focus:ring-error outline-none"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
            </div>
            
            <button
              onClick={handleExecuteLockLocal}
              className={`w-full py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase transition-colors flex justify-center items-center gap-2 cursor-pointer ${
                isLocked
                  ? "bg-secondary text-on-secondary hover:bg-opacity-95"
                  : "bg-error text-on-error hover:bg-tertiary-container"
              }`}
            >
              <ShieldAlert className="w-4.5 h-4.5" />
              {isLocked ? "Unlock Remote Node" : "Execute Secure Lock"}
            </button>
          </div>
        </div>

        {/* Card 3: Deception Mode Controls */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <EyeOff className="w-6 h-6" />
            </div>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              deceptionActive
                ? "bg-primary-container text-primary border border-primary/20 animate-pulse"
                : "bg-surface border border-outline-variant text-outline"
            }`}>
              {deceptionActive ? "Mode Active" : "Disarmed"}
            </span>
          </div>

          <h3 className="font-bold text-base text-on-surface mb-1">Deception Mode</h3>
          <p className="text-xs text-on-surface-variant mb-6 flex-1">
            Intercept lid-close and sleep signals to mask device as off while tracking remains online.
          </p>

          <div className="mt-auto border-t border-outline-variant pt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-on-surface font-medium">Lid-Close Intercept</span>
              <button
                onClick={() => setLidIntercept(!lidIntercept)}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  lidIntercept ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                  lidIntercept ? "right-1" : "left-1"
                }`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-on-surface font-medium">Fake Display Power-Off</span>
              <button
                onClick={() => setFakeDisplayOff(!fakeDisplayOff)}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  fakeDisplayOff ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                  fakeDisplayOff ? "right-1" : "left-1"
                }`}></div>
              </button>
            </div>
            <button
              onClick={onToggleDeception}
              className={`w-full py-2 mt-2 rounded border font-semibold text-center text-xs transition-colors cursor-pointer ${
                deceptionActive
                  ? "bg-primary-container text-primary border-primary/30"
                  : "bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container"
              }`}
            >
              {deceptionActive ? "Deactivate Deception" : "Deploy Deception Engine"}
            </button>
          </div>
        </div>

        {/* Card 4: Silent Webcam Snapshot (Spans 2 columns on larger viewports) */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col hover:border-primary transition-colors md:col-span-2 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 pb-3 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface leading-tight">Webcam Snapshot</h3>
                <p className="text-xs text-on-surface-variant">Silent image capture surveillance feed.</p>
              </div>
            </div>
            
            <button
              onClick={onForceCameraCapture}
              className="bg-surface-container-low text-primary border border-outline-variant py-1.5 px-3 rounded-lg font-bold text-xs tracking-wider uppercase hover:bg-surface-container transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 fill-primary/10 animate-spin" style={{ animationDuration: "3s" }} />
              Force Capture
            </button>
          </div>

          {/* Grid of Snapshots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1 flex-1">
            {cameraSnaps.map((snapSrc, index) => (
              <div key={index} className="relative group rounded-lg border border-outline-variant overflow-hidden h-28 bg-surface-container">
                <img
                  alt={`Silent Capture ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  src={snapSrc}
                />
                <div className="absolute bottom-0 left-0 w-full bg-slate-900/80 px-2 py-1 font-mono text-[9px] text-white flex justify-between">
                  <span>{index === 0 ? "10:42 AM" : index === 1 ? "09:15 AM" : "Just Now"}</span>
                  <span>CAM_FRONT</span>
                </div>
              </div>
            ))}

            {/* View Grid Overlay block */}
            <div className="relative rounded-lg border border-outline-variant border-dashed overflow-hidden h-28 bg-surface-container-low flex flex-col items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface-variant cursor-pointer transition-colors">
              <Grid className="w-6 h-6 mb-1 text-outline" />
              <span className="font-bold text-[10px] uppercase tracking-wide">
                View All ({cameraSnaps.length + 10})
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Network Override Config */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <Wifi className="w-6 h-6" />
            </div>
            <span className="px-2 py-1 rounded bg-surface border border-outline-variant text-[10px] font-mono text-outline font-bold">
              STATUS: SECURE
            </span>
          </div>

          <h3 className="font-bold text-base text-on-surface mb-1">Network Override</h3>
          <p className="text-xs text-on-surface-variant mb-6 flex-1">
            Deploy low-level network overrides to bypass physical OS sleep blocks.
          </p>

          <div className="mt-auto space-y-2 text-xs">
            <button className="w-full bg-surface text-on-surface border border-outline-variant py-2.5 px-3 rounded-lg text-left font-medium flex justify-between items-center hover:bg-surface-container-low transition-colors cursor-pointer group">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-outline" />
                <span>Force Hardware Cellular On</span>
              </span>
              <ChevronRight className="w-4 h-4 text-outline-variant group-hover:text-primary transition-colors" />
            </button>
            
            <button className="w-full bg-surface text-on-surface border border-outline-variant py-2.5 px-3 rounded-lg text-left font-medium flex justify-between items-center hover:bg-surface-container-low transition-colors cursor-pointer group">
              <span className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-outline" />
                <span>Enable Emergency P2P Hotspot</span>
              </span>
              <ChevronRight className="w-4 h-4 text-outline-variant group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
