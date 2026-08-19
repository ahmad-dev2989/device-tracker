import React from "react";
import { LayoutDashboard, Map, Terminal, Shield, AlertTriangle } from "lucide-react";

interface BottomNavBarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onEmergencyLock: () => void;
  isLocked: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeView,
  setActiveView,
  onEmergencyLock,
  isLocked,
}) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Live Map", icon: Map },
    { id: "commands", label: "Remote", icon: Terminal },
    { id: "security", label: "Settings", icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 bg-surface-container-lowest border-t border-outline-variant shadow-lg flex items-center justify-around px-2 py-3 rounded-t-xl select-none md:hidden pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center justify-center transition-all ${
              isActive
                ? "bg-primary-container text-on-primary-container rounded-full px-4 py-1.5 font-bold scale-105"
                : "text-on-surface-variant active:scale-95 px-3 py-1.5"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-primary fill-primary/10" : "text-outline"}`} />
            <span className="text-[10px] mt-0.5 tracking-wide font-medium">{tab.label}</span>
          </button>
        );
      })}

      <button
        onClick={onEmergencyLock}
        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all text-error active:scale-95 ${
          isLocked ? "bg-error/15 text-error font-bold" : ""
        }`}
      >
        <AlertTriangle className={`w-5 h-5 ${isLocked ? "fill-error/10" : ""}`} />
        <span className="text-[10px] mt-0.5 tracking-wide font-medium">Alert</span>
      </button>
    </nav>
  );
};
