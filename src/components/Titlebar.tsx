import React, { useEffect, useState } from "react";
import { minimizeWindow, toggleMaximizeWindow, closeWindow, isTauri } from "../utils/tauri";
import { ShieldCheck, Minus, Square, X, Laptop } from "lucide-react";

export const Titlebar: React.FC = () => {
  const [runningInTauri, setRunningInTauri] = useState(false);

  useEffect(() => {
    setRunningInTauri(isTauri());
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-10 bg-surface-container border-b border-outline-variant flex items-center justify-between px-3 select-none z-50 relative drag-region w-full"
      style={{ cursor: "default" }}
    >
      {/* Title & Brand Icon */}
      <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
        <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-[11px] font-bold text-on-surface tracking-wide uppercase flex items-center gap-1.5">
          OmniRecover Console
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
        </span>
      </div>

      {/* Center Drag Information */}
      <div
        data-tauri-drag-region
        className="flex-grow h-full flex items-center justify-center font-mono text-[9px] text-outline font-medium pointer-events-none"
      >
        {runningInTauri ? "SECURED IPC BACKEND SHELL" : "TAURI SIMULATOR VIEWPORT"}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-0.5 h-full">
        {/* Environment Badge */}
        <span className="hidden sm:inline-flex items-center gap-1 bg-surface-container-low border border-outline-variant px-2 py-0.5 rounded-full text-[9px] font-semibold text-outline-variant mr-3 pointer-events-none">
          <Laptop className="w-2.5 h-2.5" />
          {runningInTauri ? "TAURI" : "BROWSER"}
        </span>

        {/* Minimize */}
        <button
          onClick={minimizeWindow}
          className="w-8 h-8 rounded hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          title="Minimize Window"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize */}
        <button
          onClick={toggleMaximizeWindow}
          className="w-8 h-8 rounded hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          title="Toggle Maximize"
        >
          <Square className="w-3 h-3" />
        </button>

        {/* Close */}
        <button
          onClick={closeWindow}
          className="w-8 h-8 rounded hover:bg-error hover:text-on-error flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          title="Close Console"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
