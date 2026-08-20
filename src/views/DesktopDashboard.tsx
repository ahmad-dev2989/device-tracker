import React from "react";
import { RadarMap } from "../components/RadarMap";
import { Smartphone, Battery, Wifi, Clock, Compass, Volume2, RefreshCw, Lock, Trash2 } from "lucide-react";

interface DesktopDashboardProps {
  phoneOnline: boolean;
  batteryPhone: number;
  laptopCoords: { lat: number; lng: number };
  phoneCoords: { lat: number; lng: number };
  proximityDistance: number;
  isSyncing: boolean;
  triggerSync: () => void;
  onTriggerAlarm: () => void;
  onRemoteLock: () => void;
  onUnpairDevice: () => void;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({
  phoneOnline,
  batteryPhone,
  laptopCoords,
  phoneCoords,
  proximityDistance,
  isSyncing,
  triggerSync,
  onTriggerAlarm,
  onRemoteLock,
  onUnpairDevice,
}) => {
  return (
    <div className="flex-1 flex overflow-hidden h-full w-full bg-slate-50">
      {/* 1. Side Panel: Phone Management (Fixed 320px width) */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full p-6 text-left select-none justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">OmniRecover Panel</h2>
            <p className="text-xs text-slate-500 mt-1">Managing paired devices</p>
          </div>

          <hr className="border-slate-200" />

          {/* Device Profile Card */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">Nexus-9 Mobile</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                  phoneOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                {phoneOnline ? "● Connected" : "Offline"}
              </span>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 gap-4 font-mono text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Battery</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5" />
                  {batteryPhone}%
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Network</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" />
                  {phoneOnline ? "BLE Mesh" : "None"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Last Seen</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {phoneOnline ? "Just now" : "2h ago"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">GPS Status</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  {phoneOnline ? "Active" : "Last Stored"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device Controls</h4>
            
            <button
              onClick={onTriggerAlarm}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
            >
              <Volume2 className="w-4 h-4" />
              Ring Phone
            </button>

            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Refreshing..." : "Refresh Location"}
            </button>

            <button
              onClick={onRemoteLock}
              className="w-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Lock Phone
            </button>
          </div>
        </div>

        {/* Security Section (Bottom) */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={onUnpairDevice}
            className="w-full border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 text-slate-500 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Unpair Device
          </button>
        </div>
      </aside>

      {/* 2. Main Panel: Map View */}
      <main className="flex-1 h-full relative overflow-hidden flex flex-col">
        <RadarMap
          targetDevice="phone"
          laptopCoords={laptopCoords}
          phoneCoords={phoneCoords}
          laptopOnline={true}
          phoneOnline={phoneOnline}
          proximityDistance={proximityDistance}
        />
      </main>
    </div>
  );
};
