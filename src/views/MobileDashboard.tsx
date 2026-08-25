import React, { useState } from "react";
import { RadarMap } from "../components/RadarMap";
import { Laptop, Battery, Wifi, Clock, Power, Volume2, RefreshCw, Lock, ChevronUp, ChevronDown } from "lucide-react";
import { api } from "../utils/api";

interface MobileDashboardProps {
  laptopOnline: boolean;
  batteryLaptop: number;
  laptopCoords: { lat: number; lng: number };
  phoneCoords: { lat: number; lng: number };
  proximityDistance: number;
  isSyncing: boolean;
  triggerSync: () => void;
  onTriggerAlarm: () => void;
  onRemoteLock: () => void;
  deceptionActive: boolean;
  onToggleDeception: () => void;
  connectionStatus: string;
  pairedDevice: any | null;
  onUnpairDevice: () => void;
  checkActivePairing: () => Promise<void>;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  laptopOnline,
  batteryLaptop,
  laptopCoords,
  phoneCoords,
  proximityDistance,
  isSyncing,
  triggerSync,
  onTriggerAlarm,
  onRemoteLock,
  deceptionActive,
  onToggleDeception,
  connectionStatus,
  pairedDevice,
  onUnpairDevice,
  checkActivePairing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Pairing workflow states
  const [pairingCode, setPairingCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || pairingCode.trim().length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    setError(null);
    setIsValidating(true);
    try {
      const res = await api.validatePairingRequest(null, pairingCode.trim());
      setValidationResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to validate pairing code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleApprove = async () => {
    if (!validationResult) return;
    setError(null);
    setIsValidating(true);
    try {
      await api.approvePairingRequest(validationResult.requestId, pairingCode.trim());
      alert("Pairing approved successfully!");
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to approve pairing");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    setPairingCode("");
    setValidationResult(null);
    setError(null);
  };

  // Render pairing configuration if not paired yet
  if (!pairedDevice) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 p-6 select-none w-full h-full text-left">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-800">Pair Laptop</h3>
            <p className="text-xs text-slate-500">
              Link this phone to your laptop to remotely lock, track, and deter theft.
            </p>
          </div>

          <hr className="border-slate-200" />

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-mono">
              {error}
            </div>
          )}

          {!validationResult ? (
            <form onSubmit={handleValidate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isValidating || pairingCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 border-0"
              >
                {isValidating ? "Validating..." : "Pair Laptop"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Pairing Request From</span>
                <div className="font-bold text-slate-800 text-sm">{validationResult.device.name}</div>
                <div className="font-mono">Platform: {validationResult.device.platform}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancel}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isValidating}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-0"
                >
                  {isValidating ? "Linking..." : "Confirm Pair"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render normal paired viewport
  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden select-none">
      {/* 1. Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <RadarMap
          targetDevice="laptop"
          laptopCoords={laptopCoords}
          phoneCoords={phoneCoords}
          laptopOnline={laptopOnline}
          phoneOnline={true}
          proximityDistance={proximityDistance}
        />
      </div>

      {/* 2. Top Status Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-auto px-4 py-2 bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-full shadow-md flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            connectionStatus === "Online"
              ? "bg-emerald-500 animate-pulse"
              : connectionStatus === "Offline"
              ? "bg-slate-400"
              : connectionStatus === "Connecting"
              ? "bg-yellow-500 animate-bounce"
              : "bg-red-500"
          }`}
        ></span>
        <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">
          Status: {connectionStatus === "Online" ? "Connected" : connectionStatus}
        </span>
      </div>

      {/* 3. Bottom Sheet */}
      <div className="absolute bottom-4 left-4 right-4 z-20 md:max-w-sm md:mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col gap-4 text-left transition-all duration-300">
        {/* Toggle Details Row */}
        <div className="flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{pairedDevice.name}</h3>
              <p className="text-[10px] text-slate-400">Target Laptop Node</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-0 bg-transparent"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Minimal Stats (Always Visible) */}
        <div className="flex gap-4 text-xs bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 font-mono text-slate-500">
          <div className="flex-1 flex items-center gap-1.5 justify-center py-0.5">
            <Battery className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700 font-semibold">{batteryLaptop}%</span>
          </div>
          <div className="w-px bg-slate-200"></div>
          <div className="flex-grow flex items-center gap-1.5 justify-center py-0.5">
            <Wifi className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700 font-semibold">{laptopOnline ? "Wi-Fi" : "None"}</span>
          </div>
        </div>

        {/* Extended Details Panel (Collapsible) */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-3 font-mono text-[10px] text-slate-500 bg-slate-50/30 p-3.5 rounded-xl border border-slate-100/60 animate-fade-in divide-y-0 divide-x divide-slate-100">
            <div className="space-y-2.5">
              <div>
                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold block">Power State</span>
                <span className="text-slate-800 font-semibold">{deceptionActive ? "Lid Closed (Sim)" : "System Active"}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold block">Last Sync</span>
                <span className="text-slate-800 font-semibold">{laptopOnline ? "Continuous" : "Offline"}</span>
              </div>
            </div>
            <div className="space-y-2.5 pl-4">
              <div>
                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold block">Connection Mode</span>
                <span className="text-slate-800 font-semibold">{laptopOnline ? "Wi-Fi (Primary)" : "None"}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold block">Telemetry</span>
                <span className="text-slate-800 font-semibold">EC DSA-256 Link</span>
              </div>
            </div>
          </div>
        )}

        {/* Regular Actions Group */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onTriggerAlarm}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <Volume2 className="w-4 h-4" />
            Ring Laptop
          </button>
          
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync"}
          </button>
        </div>

        {/* Additional Controls */}
        <button
          onClick={onToggleDeception}
          className={`w-full border py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs cursor-pointer uppercase tracking-wider ${
            deceptionActive
              ? "bg-slate-100 border-slate-300 text-slate-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Power className="w-4 h-4" />
          {deceptionActive ? "Deactivate Deception" : "Simulate Lid Close"}
        </button>

        {/* Separated Emergency Command */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onRemoteLock}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border-0 shadow-md"
          >
            <Lock className="w-4 h-4" />
            Lock Remote Laptop
          </button>
        </div>

        {/* Unpair Button */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onUnpairDevice}
            className="w-full border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 text-slate-500 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Unpair Laptop
          </button>
        </div>
      </div>
    </div>
  );
};
