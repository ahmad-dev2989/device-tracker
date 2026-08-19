import React, { useState } from "react";
import {
  ShieldAlert,
  Volume2,
  Trash2,
  PhoneCall,
  Terminal,
  Activity,
  KeyRound,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

interface EmergencyLockViewProps {
  onUnlock: () => void;
  onPlayAlarm: () => void;
  onWipeData: () => void;
  phoneOnline: boolean;
  laptopOnline: boolean;
  logs: Array<{ timestamp: string; type: string; message: string }>;
}

export const EmergencyLockView: React.FC<EmergencyLockViewProps> = ({
  onUnlock,
  onPlayAlarm,
  onWipeData,
  logs,
}) => {
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockMsg, setUnlockMsg] = useState("");
  const [wipedState, setWipedState] = useState(false);

  const handleLocalUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPassword.toLowerCase() === "admin" || unlockPassword.length > 5) {
      onUnlock();
      setUnlockMsg("");
    } else {
      setUnlockMsg("Incorrect decryption credentials.");
    }
  };

  const handleLocalWipe = () => {
    const confirm = window.confirm("WARNING: This will cryptographically erase all storage partitions. This action is irreversible. Proceed?");
    if (confirm) {
      setWipedState(true);
      onWipeData();
    }
  };

  const mapBackgroundUrl =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAYEirKDRAmkumlBQoxCTQwuRCNz-MmfFF0abCnhTlhuxq0Xr4_2CRpn_IwHlgihF2LPRkl4HJr_DJV3QJU64utI9QEwn3Rz1NC8lSgRBtduRl98VDxslKkG0LmFzbNZmOwvE4AhXWYJclLNpYD1LVTLWmg0ebGZz8pir6rizYQX-fe_gbk8vUqrkckjmmMn3HT8vxFpiUJSqGYMb1ZtIhohmtMyKkX33kaSuoQVo0YB2ncb_uxZcjF";

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none animate-fade-in relative z-20 overflow-hidden text-left">
      
      {/* Top Banner (Locked Indicator) */}
      <header className="w-full bg-error text-on-error flex justify-between items-center px-gutter h-16 shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <h1 className="font-bold text-sm tracking-wide uppercase">
            Shield Guardian - Lock Protocol Active
          </h1>
        </div>
        <div className="px-3 py-1 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">
          Threat Stage 3
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-120px)] overflow-hidden">
        
        {/* Left Side: Map Tracker (Fluid 50% / full-bleed on mobile) */}
        <div className="flex-1 min-h-[220px] md:h-full relative bg-surface-variant overflow-hidden shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500 scale-105"
            style={{ backgroundImage: `url('${mapBackgroundUrl}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90 pointer-events-none"></div>

          {/* Glowing Red Ping */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-error rounded-full radar-pulse"></div>
              <div className="absolute w-7 h-7 bg-error/30 rounded-full animate-ping"></div>
              <div className="w-4.5 h-4.5 bg-error rounded-full shadow-lg relative z-10 border-2 border-surface"></div>
            </div>
          </div>

          {/* Status Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-error text-on-error px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 font-bold text-[10px] tracking-wider uppercase border border-on-error/20 backdrop-blur-md z-10">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Geo-Tracking Broadcast Active
          </div>
        </div>

        {/* Right Side: Security Lock Controls Overlay */}
        <div className="w-full md:w-[420px] shrink-0 bg-surface-container-lowest p-6 flex flex-col gap-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:shadow-[-8px_0_24px_rgba(0,0,0,0.04)] overflow-y-auto border-t md:border-t-0 md:border-l border-outline-variant pb-24 md:pb-6">
          
          <div className="flex flex-col items-center text-center gap-1.5 mt-2">
            <div className="w-14 h-14 bg-error-container text-error rounded-full flex items-center justify-center border border-error/15 shadow-inner mb-2">
              <ShieldAlert className="w-7 h-7 fill-error/5" />
            </div>
            <h2 className="text-xl font-extrabold text-error tracking-tight">DEVICE LOCKED</h2>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Unauthorized authentication block applied. Beacon is broadcasting locations via BLE mesh coordinate relay.
            </p>
          </div>

          {/* Lock Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onPlayAlarm}
              className="w-full bg-error text-on-error py-3.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow hover:shadow-md hover:bg-tertiary-container active:scale-95 transition-all cursor-pointer"
            >
              <Volume2 className="w-4.5 h-4.5 animate-bounce" />
              Scream Siren Sound
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleLocalWipe}
                disabled={wipedState}
                className="flex-1 bg-surface-container-high text-error hover:bg-error-container py-3 rounded-lg font-bold text-[10px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 border border-outline-variant cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{wipedState ? "Data Erased" : "Wipe Storage"}</span>
              </button>
              
              <button
                onClick={() => alert("Simulating police dispatch call coordinates sent: 37.7749 N, -122.4194 W")}
                className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-dim py-3 rounded-lg font-bold text-[10px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 border border-outline-variant cursor-pointer transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-primary" />
                <span>Call Authorities</span>
              </button>
            </div>
          </div>

          {/* Unlock System Form */}
          <form onSubmit={handleLocalUnlock} className="bg-surface p-4 rounded-xl border border-outline-variant space-y-3">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-on-surface flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              De-escalate Lock System
            </h3>
            
            <div className="space-y-2 text-xs">
              <input
                type="password"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-mono outline-none focus:border-primary"
                placeholder="Enter password (use 'admin' to unlock)"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
              />
              
              {unlockMsg && <p className="text-[10px] text-error font-bold">{unlockMsg}</p>}
              
              <button
                type="submit"
                className="w-full bg-secondary text-on-secondary font-bold text-[10px] uppercase tracking-widest py-2 rounded-lg hover:bg-opacity-95 transition-all cursor-pointer"
              >
                Authorize Decryption
              </button>
            </div>
          </form>

          {/* System Terminal Log snippet */}
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 text-[10px] font-mono text-on-surface-variant flex-1 mt-auto">
            <div className="flex items-center gap-1.5 pb-2 border-b border-outline-variant/50 mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-bold uppercase tracking-wider">Secured Beacon Logs</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>[LOCK] Lock protocol verified</span>
                <span className="text-outline">10:42:01 Z</span>
              </div>
              <div className="flex justify-between">
                <span>[GPS] Satellite locks active (n=9)</span>
                <span className="text-outline">10:42:05 Z</span>
              </div>
              <div className="flex justify-between text-error font-bold">
                <span>[NET] Transmitting beacon signals</span>
                <span>LIVE</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
