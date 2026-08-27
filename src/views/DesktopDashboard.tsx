import React from "react";
import { RadarMap } from "../components/RadarMap";
import { Smartphone, Battery, Wifi, Clock, Compass, Volume2, RefreshCw, Lock, Trash2 } from "lucide-react";
import { api, getApiBaseUrl } from "../utils/api";

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
  connectionStatus: string;
  pairedDevice: any | null;
  pairingRequest: any | null;
  setPairingRequest: (req: any | null) => void;
  targetTelemetry: any | null;
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
  connectionStatus,
  pairedDevice,
  pairingRequest,
  setPairingRequest,
  targetTelemetry,
}) => {
  const [timeLeft, setTimeLeft] = React.useState<number>(60);
  const [error, setError] = React.useState<string | null>(null);
  const [pairingMode, setPairingMode] = React.useState<"none" | "qr" | "text">("none");

  React.useEffect(() => {
    if (!pairingRequest) {
      setPairingMode("none");
      return;
    }

    // Timer countdown
    const expiryTime = new Date(pairingRequest.expiresAt).getTime();
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    // Polling status
    const poll = setInterval(async () => {
      try {
        const res = await api.getPairingStatus(pairingRequest.requestId);
        if (res.status === "CONSUMED" || res.status === "APPROVED") {
          clearInterval(poll);
          clearInterval(timer);
          alert("Pairing approved! Mobile connected successfully.");
          window.location.reload();
        } else if (res.status === "EXPIRED" || res.status === "CANCELLED") {
          clearInterval(poll);
          clearInterval(timer);
          setPairingRequest(null);
          setPairingMode("none");
        }
      } catch (e) {
        console.warn("Error polling pairing status:", e);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [pairingRequest, setPairingRequest]);

  const handlePairMobile = async (mode: "qr" | "text") => {
    setError(null);
    setPairingMode(mode);
    try {
      const res = await api.createPairingRequest();
      setPairingRequest(res);
      setTimeLeft(res.expiresIn || 60);
    } catch (e: any) {
      setError(e.message || "Failed to initiate pairing request");
      setPairingMode("none");
    }
  };

  const handleCancelPairing = async () => {
    if (!pairingRequest) return;
    try {
      await api.cancelPairingRequest(pairingRequest.requestId);
    } catch (e) {
      console.warn("Failed to cancel pairing request on server:", e);
    }
    setPairingRequest(null);
    setPairingMode("none");
  };

  // Render white blank screen setup portal if not paired yet
  if (!pairedDevice) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-white p-8 select-none w-full h-full text-center">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo & Header */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Compass className="w-9 h-9 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">OmniRecover</h1>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Secure Device Recovery & Remote Tracking Console
            </p>
          </div>

          <hr className="border-slate-100" />

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-mono">
              {error}
            </div>
          )}

          {pairingMode === "none" ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                To pair your mobile device, choose one of the secure connection options below:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handlePairMobile("qr")}
                  disabled={connectionStatus !== "Online"}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 cursor-pointer border-0 shadow-md shadow-blue-600/10 hover:shadow-lg disabled:opacity-50 text-center"
                >
                  <span className="font-semibold">Generate QR Code</span>
                  <span className="text-[9px] text-blue-100 capitalize font-normal">Scan with phone camera</span>
                </button>
                <button
                  onClick={() => handlePairMobile("text")}
                  disabled={connectionStatus !== "Online"}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow disabled:opacity-50 text-center"
                >
                  <span className="font-semibold text-slate-800">Generate Text Code</span>
                  <span className="text-[9px] text-slate-400 capitalize font-normal">Type code on phone</span>
                </button>
              </div>
              {connectionStatus !== "Online" && (
                <div className="text-[10px] text-slate-400 font-mono text-center flex items-center justify-center gap-1.5 mt-2 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Establishing connection to server ({connectionStatus})...
                </div>
              )}
            </div>
          ) : pairingRequest ? (
            <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
              {pairingMode === "qr" ? (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <p className="text-xs font-bold text-slate-700">Scan this QR code with the mobile app</p>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        JSON.stringify({ 
                          id: pairingRequest.requestId, 
                          code: pairingRequest.pairingCode,
                          url: (() => {
                            const apiBase = getApiBaseUrl();
                            if (apiBase.includes("localhost") || apiBase.includes("127.0.0.1")) {
                              const hostname = window.location.hostname || "localhost";
                              return apiBase.replace("localhost", hostname).replace("127.0.0.1", hostname);
                            }
                            return apiBase;
                          })()
                        })
                      )}`}
                      alt="Pairing QR Code"
                      className="w-40 h-40 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 w-full flex flex-col items-center py-2">
                  <p className="text-xs font-bold text-slate-700">Enter this 6-digit code on the mobile app</p>
                  <div className="bg-white px-8 py-5 rounded-2xl border border-slate-200/60 shadow-sm">
                    <span className="text-3xl font-black font-mono tracking-widest text-blue-600">
                      {pairingRequest.pairingCode}
                    </span>
                  </div>
                </div>
              )}

              <div className="w-full space-y-4">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Request expires in: <span className="text-red-500 font-bold">{timeLeft}s</span>
                </p>
                <button
                  onClick={handleCancelPairing}
                  className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs font-semibold">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Initializing secure link...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render normal paired panel with sidebar and radar map
  return (
    <div className="flex-1 flex overflow-hidden h-full w-full bg-slate-50">
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full p-6 text-left select-none justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">OmniRecover Panel</h2>
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "Online"
                    ? "bg-emerald-500 animate-pulse"
                    : connectionStatus === "Offline"
                    ? "bg-slate-400"
                    : connectionStatus === "Connecting"
                    ? "bg-yellow-500 animate-bounce"
                    : "bg-red-500"
                }`}
                title={`Client: ${connectionStatus}`}
              ></span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
              Status: {connectionStatus === "Online" ? "Connected" : connectionStatus}
            </p>
          </div>

          <hr className="border-slate-200" />

          {/* Device Profile Card */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">{pairedDevice.name}</h3>
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
                  {targetTelemetry?.batteryLevel !== undefined ? `${targetTelemetry.batteryLevel}%` : `${batteryPhone}%`}
                  {targetTelemetry?.isCharging && <span className="text-[9px] text-emerald-500 font-bold">(Charging)</span>}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Network</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" />
                  {targetTelemetry?.networkType || (phoneOnline ? "Wi-Fi" : "None")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Last Seen</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {phoneOnline ? "Just now" : (targetTelemetry?.timestamp ? new Date(targetTelemetry.timestamp).toLocaleTimeString() : new Date(pairedDevice.lastSeenAt).toLocaleTimeString())}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">GPS Status</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1 font-mono uppercase text-[10px]">
                  <Compass className="w-3.5 h-3.5" />
                  {targetTelemetry?.source || (phoneOnline ? "Active" : "Last Stored")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2 border-t border-slate-200/50 pt-2">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Location Status</span>
                <span className="text-slate-800 font-semibold flex flex-col gap-0.5">
                  {targetTelemetry?.latitude && targetTelemetry?.longitude ? (
                    <>
                      <span className="font-mono text-[10px] text-slate-800 font-bold">{targetTelemetry.latitude.toFixed(5)}° N, {Math.abs(targetTelemetry.longitude).toFixed(5)}° W</span>
                      <span className="text-[9px] text-slate-400 font-normal normal-case">
                        {phoneOnline ? "Live location" : "Last known location"} ({targetTelemetry.source}, ±{Math.round(targetTelemetry.accuracy)}m)
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-[10px]">No Location Data Available</span>
                  )}
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
