import React, { useState } from "react";
import { Plus, Minus, Compass, Laptop, Smartphone, Eye, EyeOff } from "lucide-react";

interface RadarMapProps {
  layoutMode: "desktop" | "mobile" | "fluid";
  targetDevice: "laptop" | "phone";
  setTargetDevice: (device: "laptop" | "phone") => void;
  laptopCoords: { lat: number; lng: number };
  phoneCoords: { lat: number; lng: number };
  laptopOnline: boolean;
  phoneOnline: boolean;
  proximityDistance: number; // in meters
}

export const RadarMap: React.FC<RadarMapProps> = ({
  layoutMode,
  targetDevice,
  setTargetDevice,
  laptopCoords,
  phoneCoords,
  laptopOnline,
  phoneOnline,
  proximityDistance,
}) => {
  const [zoom, setZoom] = useState(15);
  const [showGrid, setShowGrid] = useState(true);

  // Vector map style representing the high contrast light style
  const mapBackgroundUrl =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCo8W3fZrrbyYUw-PWacvtclGzUUoyWna85OJC4qRorQgPDKaK6TrktnA_Mfbss2kLMou8eT8LFQ8k4xJgQk2cjUHa_8VBrSPyrcYgMLBSY1GwvrTkc_2UC2NWPGCrGMraxPbUPBwYFoojWtQSG-JrfAF3XlXqKGEKqY34wYQSNLYEfRVIYAgadlV-GW8NqKfCSYw7vNedg6MY1beGHvj4opR9hZM-zZzELta589N7seKiCEBLpBV4dhQ";

  // Proximity calculations for display
  const scale = zoom / 15;

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center min-h-[350px] bg-surface-container-low select-none">
      {/* Map Background Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-300 opacity-60 mix-blend-multiply"
        style={{
          backgroundImage: `url('${mapBackgroundUrl}')`,
          transform: `scale(${scale})`,
        }}
      ></div>

      {/* Grid overlay for tactical layout */}
      {showGrid && <div className="absolute inset-0 bg-tactical-grid pointer-events-none z-1"></div>}

      {/* Radar Overlay Sweeping Circles (Centred around active device) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 border border-primary/10 rounded-full absolute"></div>
        <div className="w-72 h-72 border border-primary/20 rounded-full absolute"></div>
        <div className="w-48 h-48 border border-primary/30 rounded-full absolute"></div>
        {/* Radar ping animation circle */}
        <div className="w-64 h-64 border-2 border-primary/25 rounded-full absolute radar-pulse"></div>
        <div className="w-32 h-32 border border-primary/40 rounded-full absolute bg-primary/[0.03]"></div>
      </div>

      {/* Connection Dotted Proximity Line SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#003ec7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#006c48" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Responsive coordinates for line representation */}
        <line
          x1="50%"
          y1="35%"
          x2="35%"
          y2="65%"
          stroke="url(#lineGrad)"
          strokeDasharray="5 5"
          strokeWidth="2"
          className="animate-[dash_10s_linear_infinite]"
        />
        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -100;
            }
          }
        `}</style>
      </svg>

      {/* Active Device Markers */}
      
      {/* 1. Laptop Marker (Alpha-Book Pro) at (50%, 35%) */}
      <div
        onClick={() => setTargetDevice("laptop")}
        className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group select-none"
      >
        <div className="relative">
          {targetDevice === "laptop" && (
            <div className="absolute inset-0 bg-primary rounded-full radar-pulse"></div>
          )}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-md relative z-10 transition-all ${
              targetDevice === "laptop"
                ? "bg-primary text-on-primary border-surface scale-110"
                : "bg-surface text-on-surface-variant border-outline-variant hover:border-primary"
            }`}
          >
            <Laptop className="w-5 h-5" />
            <span
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface ${
                laptopOnline ? "bg-secondary animate-pulse" : "bg-outline"
              }`}
            ></span>
          </div>
        </div>
        <div className="mt-2 bg-surface px-3 py-1 rounded-full border border-outline-variant shadow-sm text-center transition-all opacity-80 group-hover:opacity-100">
          <div className="font-semibold text-[10px] text-on-surface uppercase tracking-wide">
            Alpha-Book Pro
          </div>
          <div className="font-mono text-[9px] text-secondary font-bold">
            {laptopOnline ? "Connected" : "Offline"}
          </div>
        </div>
      </div>

      {/* 2. Phone Marker (Nexus-9 / Android) at (35%, 65%) */}
      <div
        onClick={() => setTargetDevice("phone")}
        className="absolute top-[65%] left-[35%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group select-none"
      >
        <div className="relative">
          {targetDevice === "phone" && (
            <div className="absolute inset-0 bg-primary rounded-full radar-pulse"></div>
          )}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-md relative z-10 transition-all ${
              targetDevice === "phone"
                ? "bg-primary text-on-primary border-surface scale-110"
                : "bg-surface text-on-surface-variant border-outline-variant hover:border-primary"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface ${
                phoneOnline ? "bg-secondary animate-pulse" : "bg-outline"
              }`}
            ></span>
          </div>
        </div>
        <div className="mt-2 bg-surface px-3 py-1 rounded-full border border-outline-variant shadow-sm text-center transition-all opacity-80 group-hover:opacity-100">
          <div className="font-semibold text-[10px] text-on-surface uppercase tracking-wide">
            Nexus-9 Mobile
          </div>
          <div className="font-mono text-[9px] text-outline font-bold">
            {phoneOnline ? "Connected" : "Last seen: 2h ago"}
          </div>
        </div>
      </div>

      {/* Map Control Buttons (Zoom, Grid Toggle) */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        <div className="bg-surface rounded-lg border border-outline-variant overflow-hidden flex flex-col shadow-sm">
          <button
            onClick={() => setZoom((prev) => Math.min(18, prev + 1))}
            className="p-2 text-on-surface hover:bg-surface-container transition-colors border-b border-outline-variant"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(12, prev - 1))}
            className="p-2 text-on-surface hover:bg-surface-container transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`rounded-lg border p-2 shadow-sm transition-colors ${
            showGrid
              ? "bg-primary-container text-primary border-primary-container"
              : "bg-surface text-on-surface hover:bg-surface-container border-outline-variant"
          }`}
          title="Toggle Grid Overlay"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Proximity Stats Overlay Label */}
      <div className="absolute bottom-4 left-4 z-30 bg-surface-container-lowest/90 px-3 py-2 rounded-lg border border-outline-variant/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping"></span>
          <span className="font-medium text-on-surface">Proximity Grid:</span>
          <span className="font-mono font-bold text-primary">{proximityDistance}m</span>
        </div>
      </div>
    </div>
  );
};
