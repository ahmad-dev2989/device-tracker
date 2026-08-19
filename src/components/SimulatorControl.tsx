import React from "react";
import { Laptop, Smartphone, Monitor, ShieldCheck, RefreshCw, Signal } from "lucide-react";

interface SimulatorControlProps {
  layoutMode: "desktop" | "mobile" | "fluid";
  setLayoutMode: (mode: "desktop" | "mobile" | "fluid") => void;
  targetDevice: "laptop" | "phone";
  setTargetDevice: (device: "laptop" | "phone") => void;
  latency: number;
  triggerSync: () => void;
  isSyncing: boolean;
}

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  layoutMode,
  setLayoutMode,
  targetDevice,
  setTargetDevice,
  latency,
  triggerSync,
  isSyncing,
}) => {
  return (
    <div className="bg-surface-container border-b border-outline-variant px-gutter py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none z-50 relative">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-bold text-primary">
          <ShieldCheck className="w-4 h-4" />
          <span>OmniRecover Studio</span>
        </div>
        <div className="w-px h-4 bg-outline-variant hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant font-medium">Layout Simulator:</span>
          <div className="flex bg-surface-container-low rounded-lg p-0.5 border border-outline-variant">
            <button
              onClick={() => setLayoutMode("fluid")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                layoutMode === "fluid"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Fluid</span>
            </button>
            <button
              onClick={() => setLayoutMode("desktop")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                layoutMode === "desktop"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setLayoutMode("mobile")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                layoutMode === "mobile"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant font-medium">Target Device:</span>
          <div className="flex bg-surface-container-low rounded-lg p-0.5 border border-outline-variant">
            <button
              onClick={() => setTargetDevice("laptop")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                targetDevice === "laptop"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Laptop
            </button>
            <button
              onClick={() => setTargetDevice("phone")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                targetDevice === "phone"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Android
            </button>
          </div>
        </div>

        <div className="w-px h-4 bg-outline-variant hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-on-surface-variant flex items-center gap-1">
            <Signal className="w-3 h-3 text-secondary" />
            <span>RTT: <strong className="text-on-surface">{latency}ms</strong></span>
          </span>
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-primary hover:text-primary-container disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Force Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
};
