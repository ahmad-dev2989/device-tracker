import React from "react";
import { LayoutDashboard, Map, Terminal, Shield, Lock, LifeBuoy, Settings, Power } from "lucide-react";

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onEmergencyLock: () => void;
  isLocked: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  onEmergencyLock,
  isLocked,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Live Map", icon: Map },
    { id: "commands", label: "Remote Commands", icon: Terminal },
    { id: "security", label: "Security Settings", icon: Shield },
  ];

  return (
    <aside className="w-64 border-r border-outline-variant bg-surface-container-lowest flex flex-col p-stack-md shrink-0 h-full select-none">
      {/* Brand Profile Header */}
      <div className="mb-stack-lg flex items-center gap-3 p-2 rounded-xl border border-outline-variant bg-surface-bright">
        <div className="relative">
          <img
            alt="Security Administrator"
            className="w-10 h-10 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmR0j9S-gxQ7OBekH-0OhEl3yJziBcM2PGM-h0lSkadowEToCm2iZVux8W5-phTzlMdBWHdzBm5fcUJQfL3X8PiyKowUY2g7Nh1KoFnimXUO0PrH-hmhaUJnCqehrlGFAyLktSCPTVS-P4IxJ0ea5gX01S7sOmoZNWfIDYdAj8ZIjgr6h8__GjRKdpN0ogibwN-CxheLyaEJFrfhgWjPpb11fCTPMe_UtUTyILrpoC_yye93dUSpl03w"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-surface-container-lowest animate-pulse"></span>
        </div>
        <div>
          <div className="font-bold text-primary text-sm leading-tight">Guardian System</div>
          <div className="text-[10px] text-secondary font-medium tracking-wide uppercase mt-0.5">
            Vigilance Active
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-medium text-sm group ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? "text-primary fill-primary/10" : "text-outline"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="mt-auto space-y-3 pt-stack-md border-t border-outline-variant">
        <button
          onClick={onEmergencyLock}
          className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-sm ${
            isLocked
              ? "bg-secondary-container text-on-secondary-container hover:bg-opacity-95"
              : "bg-error text-on-error hover:bg-tertiary-container"
          }`}
        >
          {isLocked ? (
            <>
              <Power className="w-4 h-4" />
              Unlock System
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 fill-on-error/10" />
              Emergency Lock
            </>
          )}
        </button>

        <div className="space-y-0.5">
          <button
            onClick={() => setActiveView("support")}
            className="w-full flex items-center gap-3 text-on-surface-variant px-4 py-2 hover:bg-surface-container rounded-lg transition-colors text-left text-xs font-medium"
          >
            <LifeBuoy className="w-4 h-4 text-outline" />
            <span>Support</span>
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className="w-full flex items-center gap-3 text-on-surface-variant px-4 py-2 hover:bg-surface-container rounded-lg transition-colors text-left text-xs font-medium"
          >
            <Settings className="w-4 h-4 text-outline" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
