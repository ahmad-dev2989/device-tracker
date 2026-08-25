import React from "react";
import { RadarMap } from "../components/RadarMap";
import { Smartphone, Battery, Wifi, Clock, Compass, Volume2, RefreshCw, Lock, Trash2 } from "lucide-react";
import { api } from "../utils/api";

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
}) => {
  const [timeLeft, setTimeLeft] = React.useState<number>(60);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pairingRequest) return;

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

  const handlePairMobile = async () => {
    setError(null);
    try {
      const res = await api.createPairingRequest();
      setPairingRequest(res);
      setTimeLeft(res.expiresIn || 60);
    } catch (e: any) {
      setError(e.message || "Failed to initiate pairing request");
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
  };

  const renderSidebar = () => {
    if (!pairedDevice) {
      return (
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full p-6 text-left select-none justify-between overflow-y-auto">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Mobile Device</h2>
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "Online"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-400"
                  }`}
                ></span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Status: Not Connected
              </p>
            </div>

            <hr className="border-slate-200" />

            {!pairingRequest ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pair your mobile device to enable remote tracking, location updates, and recovery controls.
                </p>
                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-600 font-mono">
                    {error}
                  </div>
                )}
                <button
                  onClick={handlePairMobile}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  Pair Mobile
                </button>
              </div>
            ) : (
              <div className="space-y-5 text-center py-2">
                <p className="text-xs font-bold text-slate-700">Scan QR with mobile app to pair</p>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      JSON.stringify({ id: pairingRequest.requestId, code: pairingRequest.pairingCode })
                    )}`}
                    alt="Pairing QR Code"
                    className="w-36 h-36 border border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Pairing Code</span>
                  <span className="text-2xl font-black font-mono tracking-widest text-blue-600 block">{pairingRequest.pairingCode}</span>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Expires in: <span className="text-red-500 font-bold">{timeLeft}s</span>
                  </p>
                  <button
                    onClick={handleCancelPairing}
                    className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      );
    }

    // Normal paired sidebar
    return (
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
                  {phoneOnline ? "Just now" : new Date(pairedDevice.lastSeenAt).toLocaleTimeString()}
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
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full w-full bg-slate-50">
      {/* 1. Side Panel */}
      {renderSidebar()}

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
