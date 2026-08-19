import React from "react";
import {
  Smartphone,
  Laptop,
  CheckCircle,
  Clock,
  Activity,
  AlertTriangle,
  Lock,
  Compass,
  Volume2,
  LockKeyhole,
  EyeOff
} from "lucide-react";

interface DashboardViewProps {
  onTriggerAlarm: () => void;
  onRemoteLock: () => void;
  onToggleDeception: () => void;
  deceptionActive: boolean;
  batteryLaptop: number;
  batteryPhone: number;
  phoneOnline: boolean;
  laptopOnline: boolean;
  onPingDevice: (device: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onTriggerAlarm,
  onRemoteLock,
  onToggleDeception,
  deceptionActive,
  batteryLaptop,
  batteryPhone,
  phoneOnline,
  laptopOnline,
}) => {
  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      {/* System Status Header Banner */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface">System Status</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-xs text-secondary font-semibold uppercase tracking-wider">
              Vigilance Active
            </span>
          </div>
        </div>
        <div className="bg-surface-container px-4 py-2 rounded-lg border border-outline-variant flex flex-col min-w-[120px]">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
            Devices Paired
          </span>
          <span className="text-xl md:text-2xl text-primary font-bold">2</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        {/* Left Column: Device Cards */}
        <div className="lg:col-span-2 space-y-stack-md">
          
          {/* Device 1: Android Mobile */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md transition-shadow hover:shadow-sm">
            <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-sm text-on-surface">Android Mobile</h2>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                phoneOnline 
                  ? "bg-secondary-container text-on-secondary-container border-outline-variant" 
                  : "bg-surface-container text-on-surface-variant border-outline-variant"
              }`}>
                {phoneOnline ? "Active Pairing" : "Offline"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 font-mono text-xs text-on-surface-variant">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Battery</span>
                <span className="text-on-surface font-semibold">{batteryPhone}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Signal Strength</span>
                <span className="text-on-surface font-semibold">{phoneOnline ? "Excellent (-65 dBm)" : "No Connection"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Last Sync</span>
                <span className="text-on-surface font-semibold">{phoneOnline ? "Just now" : "2h ago"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Connection</span>
                <span className="text-on-surface font-semibold">{phoneOnline ? "Mesh Relay" : "BLE Beacon Only"}</span>
              </div>
            </div>

            <div className="mt-stack-md pt-stack-sm border-t border-outline-variant flex justify-end gap-2">
              <button 
                onClick={onRemoteLock}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer"
                title="Lock Device"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button 
                onClick={onTriggerAlarm}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer"
                title="Sound Deterrent Siren"
              >
                <Volume2 className="w-4 h-4 text-error" />
              </button>
            </div>
          </div>

          {/* Device 2: Windows Laptop */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md transition-shadow hover:shadow-sm">
            <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-sm text-on-surface">Windows Laptop</h2>
              </div>
              <span className="bg-surface-container-low text-secondary px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-outline-variant">
                This Device
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 font-mono text-xs text-on-surface-variant">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Battery</span>
                <span className="text-on-surface font-semibold">{batteryLaptop}% {batteryLaptop === 100 ? "(Plugged in)" : ""}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Signal Strength</span>
                <span className="text-on-surface font-semibold">Strong (Wired)</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Last Sync</span>
                <span className="text-on-surface font-semibold">Continuous</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Connection</span>
                <span className="text-on-surface font-semibold">Wi-Fi (Primary)</span>
              </div>
            </div>

            <div className="mt-stack-md pt-stack-sm border-t border-outline-variant flex justify-end gap-2">
              <button 
                onClick={onToggleDeception}
                className={`p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer ${deceptionActive ? "bg-primary-container text-primary font-bold" : ""}`}
                title="Toggle Deception Power Interception"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Actions & Logs Summary */}
        <div className="space-y-stack-lg">
          
          {/* Quick Actions Panel */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col gap-3">
            <h3 className="font-bold text-sm border-b border-outline-variant pb-stack-sm text-on-surface uppercase tracking-wider">
              Quick Actions
            </h3>
            
            <button 
              onClick={onTriggerAlarm}
              className="w-full bg-error text-on-error py-3 rounded-lg font-bold hover:bg-tertiary-container transition-colors flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer uppercase tracking-wider"
            >
              <Volume2 className="w-4 h-4 fill-on-error/10 animate-bounce" />
              Trigger Detonation Alarm
            </button>
            
            <button 
              onClick={onRemoteLock}
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer uppercase tracking-wider"
            >
              <LockKeyhole className="w-4 h-4 fill-on-primary/10" />
              Lock Remote Device
            </button>
            
            <button 
              onClick={onToggleDeception}
              className={`w-full border py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs cursor-pointer uppercase tracking-wider ${
                deceptionActive 
                  ? "bg-primary-container border-primary text-primary" 
                  : "border-outline text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <EyeOff className="w-4 h-4" />
              {deceptionActive ? "Disable Deception Mode" : "Enable Deception Mode"}
            </button>
          </div>

          {/* Activity Feed Snippet */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
            <h3 className="font-bold text-sm border-b border-outline-variant pb-stack-sm text-on-surface uppercase tracking-wider mb-3">
              Vigilance Activity Log
            </h3>
            <ul className="space-y-4 text-xs">
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-on-surface">Connection handshake successful</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">Android Mobile • 2 mins ago</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Compass className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-on-surface">Location updated via Mesh Relay</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">Android Mobile • 15 mins ago</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Clock className="w-4 h-4 text-outline mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-on-surface">Routine telemetry sync check</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">System Anchor • 1 hour ago</p>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
