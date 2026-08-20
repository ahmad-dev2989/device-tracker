import React, { useEffect, useState } from "react";
import { minimizeWindow, toggleMaximizeWindow, closeWindow, isTauri } from "../utils/tauri";
import { ShieldCheck, Minus, Square, X } from "lucide-react";

export const Titlebar: React.FC = () => {
  const [runningInTauri, setRunningInTauri] = useState(false);

  useEffect(() => {
    setRunningInTauri(isTauri());
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 select-none z-50 relative drag-region w-full"
      style={{ cursor: "default" }}
    >
      {/* Title & Brand Icon */}
      <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
        <ShieldCheck className="w-4 h-4 text-blue-500" />
        <span className="text-[10px] font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5 font-sans">
          OmniRecover Console
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </span>
      </div>

      {/* Center Drag Information */}
      <div
        data-tauri-drag-region
        className="flex-grow h-full flex items-center justify-center font-mono text-[9px] text-slate-500 font-semibold tracking-wider pointer-events-none"
      >
        {runningInTauri ? "SECURED PEER LINK SHELL" : "SIMULATED LOCAL VIEWPORT"}
      </div>

      {/* Right Window Controls */}
      <div className="flex items-center gap-0.5 h-full">
        {/* Minimize */}
        <button
          onClick={minimizeWindow}
          className="w-9 h-8 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize */}
        <button
          onClick={toggleMaximizeWindow}
          className="w-9 h-8 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>

        {/* Close */}
        <button
          onClick={closeWindow}
          className="w-9 h-8 rounded hover:bg-red-600 hover:text-white flex items-center justify-center text-slate-400 transition-colors cursor-pointer border-0 bg-transparent"
          title="Close Console"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
