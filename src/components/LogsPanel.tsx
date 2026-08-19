import React, { useEffect, useRef } from "react";
import { Terminal, RefreshCw } from "lucide-react";

interface LogMessage {
  timestamp: string;
  type: "SYS" | "LOC" | "NET" | "ERR" | "WARN";
  message: string;
}

interface LogsPanelProps {
  logs: LogMessage[];
  onClearLogs?: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClearLogs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeStyle = (type: LogMessage["type"]) => {
    switch (type) {
      case "SYS":
        return "text-[#6fdba7]"; // green
      case "LOC":
        return "text-[#a1c6ff]"; // light blue
      case "NET":
        return "text-secondary-fixed"; // cyanish
      case "ERR":
        return "text-error font-bold"; // red
      case "WARN":
        return "text-amber-400 font-medium"; // yellow
      default:
        return "text-on-surface-variant";
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden flex flex-col h-full min-h-[220px]">
      {/* Header */}
      <div className="p-3 bg-surface-container border-b border-outline-variant flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-outline" />
          <span className="font-bold text-xs uppercase tracking-wider text-on-surface">
            Telemetry Feed Logs
          </span>
        </div>
        {onClearLogs && (
          <button
            onClick={onClearLogs}
            className="text-[10px] text-outline hover:text-primary transition-colors cursor-pointer flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Log
          </button>
        )}
      </div>

      {/* Terminal View */}
      <div
        ref={containerRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-[#0a0a0c] text-slate-300 space-y-2 leading-relaxed"
        style={{ scrollbarWidth: "thin" }}
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 italic select-none">Initializing telemetry socket...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex gap-2 items-start text-left select-text">
              <span className="text-slate-600 select-none">
                &gt; {log.timestamp}
              </span>
              <span className={`font-bold select-none shrink-0 [${getTypeStyle(log.type)}]`}>
                [{log.type}]
              </span>
              <span className="flex-1 break-all">{log.message}</span>
            </div>
          ))
        )}
        <div className="flex gap-2 items-center text-slate-500 animate-pulse select-none">
          <span>&gt;</span>
          <span className="w-1.5 h-3.5 bg-slate-500 inline-block"></span>
          <span>Awaiting next ping telemetry packet...</span>
        </div>
      </div>
    </div>
  );
};
