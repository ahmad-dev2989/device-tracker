import React, { useState } from "react";
import { getAppPlatform } from "../utils/platform";
import { AlertTriangle, Lock, ShieldAlert, Volume2, Trash2, KeyRound } from "lucide-react";

interface EmergencyLockViewProps {
  onUnlock: () => void;
  onPlayAlarm: () => void;
  onWipeData: () => void;
}

export const EmergencyLockView: React.FC<EmergencyLockViewProps> = ({
  onUnlock,
  onPlayAlarm,
  onWipeData,
}) => {
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockMsg, setUnlockMsg] = useState("");
  const [wipedState, setWipedState] = useState(false);
  const platform = getAppPlatform();

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
    const confirm = window.confirm(
      "WARNING: This will cryptographically erase all storage partitions. This action is irreversible. Proceed?"
    );
    if (confirm) {
      setWipedState(true);
      onWipeData();
    }
  };

  const mapBackgroundUrl =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAYEirKDRAmkumlBQoxCTQwuRCNz-MmfFF0abCnhTlhuxq0Xr4_2CRpn_IwHlgihF2LPRkl4HJr_DJV3QJU64utI9QEwn3Rz1NC8lSgRBtduRl98VDxslKkG0LmFzbNZmOwvE4AhXWYJclLNpYD1LVTLWmg0ebGZz8pir6rizYQX-fe_gbk8vUqrkckjmmMn3HT8vxFpiUJSqGYMb1ZtIhohmtMyKkX33kaSuoQVo0YB2ncb_uxZcjF";

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-50 select-none animate-fade-in relative z-20 overflow-hidden text-left">
      
      {/* 1. Header (Locked Indicator) - Render only on Desktop, or simple bar on Mobile */}
      {platform === "desktop" ? (
        <header className="w-full bg-red-600 text-white flex justify-between items-center px-6 h-14 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse text-white" />
            <h1 className="font-bold text-xs tracking-wide uppercase font-sans">
              OmniRecover Lock Protocol Active
            </h1>
          </div>
          <div className="px-3 py-1 bg-white/20 rounded text-[9px] font-bold uppercase tracking-wider">
            Terminal Lock
          </div>
        </header>
      ) : (
        <header className="w-full bg-red-600 text-white flex items-center justify-center h-12 shrink-0 z-20 shadow-sm px-4">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4.5 h-4.5 animate-pulse" />
            <span className="font-extrabold text-[10px] tracking-wider uppercase font-sans">
              System Lockdown
            </span>
          </div>
        </header>
      )}

      {/* 2. Main content split */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* Map Background visual */}
        <div className="flex-1 min-h-[220px] md:h-full relative bg-slate-200 overflow-hidden shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500 scale-105 opacity-55 mix-blend-multiply"
            style={{ backgroundImage: `url('${mapBackgroundUrl}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent opacity-90 pointer-events-none"></div>

          {/* Glowing Red Ping */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-red-600 rounded-full radar-pulse"></div>
              <div className="absolute w-7 h-7 bg-red-600/30 rounded-full animate-ping"></div>
              <div className="w-4.5 h-4.5 bg-red-600 rounded-full shadow-lg relative z-10 border-2 border-white"></div>
            </div>
          </div>
        </div>

        {/* Security Lock Controls Panel */}
        <div className="w-full md:w-[380px] shrink-0 bg-white p-6 flex flex-col gap-6 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] md:shadow-[-8px_0_24px_rgba(0,0,0,0.03)] overflow-y-auto border-t md:border-t-0 md:border-l border-slate-200 pb-20 md:pb-6 justify-between">
          
          <div className="space-y-6">
            {/* Locked Badge Icon */}
            <div className="flex flex-col items-center text-center gap-2 mt-2">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100 shadow-inner mb-1">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-red-600 tracking-tight">DEVICE ACCESS BLOCKED</h2>
              <p className="text-[11px] text-slate-500 leading-normal max-w-xs">
                Pairing channel secure lockdown initiated. Beacon is broadcasting system location data via encrypted mesh relays.
              </p>
            </div>

            {/* Actions List */}
            <div className="space-y-3">
              <button
                onClick={onPlayAlarm}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer border-0"
              >
                <Volume2 className="w-4 h-4" />
                Scream Remote Siren
              </button>

              <button
                onClick={handleLocalWipe}
                disabled={wipedState}
                className="w-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {wipedState ? "Data Erasure Sent" : "Wipe Storage Partition"}
              </button>
            </div>
          </div>

          {/* Unlock Credentials Form */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <form onSubmit={handleLocalUnlock} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5 leading-none">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                Disarm Lockdown
              </h3>
              
              <div className="space-y-2 text-xs">
                <input
                  type="password"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono outline-none focus:border-blue-500 text-slate-800"
                  placeholder="Password (use 'admin' to unlock)"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                />
                
                {unlockMsg && <p className="text-[10px] text-red-600 font-bold">{unlockMsg}</p>}
                
                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest py-2 rounded-lg transition-colors cursor-pointer border-0"
                >
                  Decrypt Client
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
