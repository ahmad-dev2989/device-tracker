import React from "react";
import { Compass, ShieldCheck, Wifi, Cpu, Layers } from "lucide-react";

interface TelemetryOverlayProps {
  deviceName: string;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  ipAddress: string;
  wifiSsid: string;
  bleNodes: number;
  batteryLevel: number;
}

export const TelemetryOverlay: React.FC<TelemetryOverlayProps> = ({
  deviceName,
  isOnline,
  latitude,
  longitude,
  accuracy,
  ipAddress,
  wifiSsid,
  bleNodes,
  batteryLevel,
}) => {
  return (
    <div className="w-80 shrink-0 bg-surface border border-outline-variant rounded-xl p-4 shadow-sm backdrop-blur-md bg-opacity-95 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: "12s" }} />
          <h2 className="font-semibold text-sm text-on-surface">Telemetry Data</h2>
        </div>
        <div className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold tracking-wide animate-pulse">
          LIVE
        </div>
      </div>

      {/* Info Rows */}
      <div className="space-y-4 text-xs">
        <div>
          <div className="text-[10px] text-outline uppercase tracking-wider font-bold mb-1">
            Target Device
          </div>
          <div className="font-medium text-on-surface flex items-center gap-2 text-sm">
            {deviceName}
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-secondary animate-pulse" : "bg-outline"}`}></span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider font-bold mb-1">
              Coordinates
            </div>
            <div className="font-mono text-on-surface font-semibold">{latitude.toFixed(5)}° N</div>
            <div className="font-mono text-on-surface font-semibold">{longitude.toFixed(5)}° W</div>
          </div>
          <div>
            <div className="text-[10px] text-outline uppercase tracking-wider font-bold mb-1">
              Accuracy
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full mt-2 overflow-hidden border border-outline-variant/30">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(10, 100 - accuracy * 10)}%` }}
              ></div>
            </div>
            <div className="font-mono text-outline text-right mt-1 text-[10px]">
              ±{accuracy.toFixed(1)}m
            </div>
          </div>
        </div>

        {/* Tactical Info Badge */}
        <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              Public IP
            </span>
            <span className="font-mono text-on-surface font-medium">{ipAddress}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              Wi-Fi SSID
            </span>
            <span className="font-mono text-on-surface font-medium truncate max-w-[120px] text-right" title={wifiSsid}>
              {wifiSsid}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              BLE Mesh
            </span>
            <span className="font-mono text-secondary font-bold">
              {bleNodes} Node{bleNodes !== 1 ? "s" : ""} Visible
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Battery
            </span>
            <span className="font-mono text-on-surface font-medium">
              {batteryLevel}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
