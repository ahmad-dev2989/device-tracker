import React, { useState } from "react";
import {
  ShieldAlert,
  Fingerprint,
  Link,
  Lock,
  Key,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  Bluetooth
} from "lucide-react";

interface SecuritySettingsProps {
  onUpdatePassword: (cur: string, next: string) => void;
  bleMeshEnabled: boolean;
  onToggleBleMesh: () => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onUpdatePassword,
  bleMeshEnabled,
  onToggleBleMesh,
}) => {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      setUpdateMsg("Please fill in both password fields.");
      return;
    }
    setIsUpdating(true);
    setUpdateMsg("");
    setTimeout(() => {
      onUpdatePassword(currentPass, newPass);
      setIsUpdating(false);
      setUpdateMsg("Credentials updated successfully.");
      setCurrentPass("");
      setNewPass("");
      setTimeout(() => setUpdateMsg(""), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      {/* Header */}
      <div className="mb-stack-lg border-b border-outline-variant pb-4">
        <h2 className="text-xl md:text-2xl font-bold text-on-background mb-1">
          Sentinel Protocol &amp; Pairing
        </h2>
        <p className="text-xs text-on-surface-variant">
          Configure recovery handshakes, master authority settings, and BLE mesh routing keys.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-md">
        
        {/* Pairing Status Card */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col">
          <div className="flex items-center justify-between mb-stack-md border-b border-outline-variant pb-stack-sm select-none">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-secondary fill-secondary/10" />
              <h3 className="font-bold text-sm text-on-background">Pairing Status</h3>
            </div>
            <span className="bg-secondary-container text-on-secondary-container font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></span>
              Secure Handshake Verified
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-stack-md items-center mt-2">
            {/* Sync Visual widget */}
            <div className="space-y-3">
              <div className="p-3 border border-outline-variant rounded-lg bg-surface flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Primary Node</p>
                  <p className="font-semibold text-xs text-on-surface">MacBook Pro 16"</p>
                  <p className="font-mono text-[9px] text-on-surface-variant mt-0.5">ID: MAC-88A9-2B</p>
                </div>
                <Cpu className="w-8 h-8 text-secondary" />
              </div>
              
              <div className="flex justify-center text-outline-variant">
                <Link className="w-4 h-4 animate-bounce" />
              </div>

              <div className="p-3 border border-outline-variant rounded-lg bg-surface flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Paired Anchor</p>
                  <p className="font-semibold text-xs text-on-surface">iPhone 15 Pro</p>
                  <p className="font-mono text-[9px] text-on-surface-variant mt-0.5">ID: IPH-44C1-9F</p>
                </div>
                <Layers className="w-8 h-8 text-secondary" />
              </div>
            </div>

            {/* Cryptographic লিংক description */}
            <div className="bg-surface-container p-4 rounded-lg h-full flex flex-col justify-center border border-outline-variant/30 text-xs">
              <h4 className="font-bold text-sm text-on-surface mb-2">Cryptographic Link</h4>
              <p className="text-on-surface-variant text-[11px] leading-relaxed mb-4">
                End-to-end encrypted channel established. Heartbeats synchronize tokens dynamically every 30s.
              </p>
              
              <div className="space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Cipher Suite:</span>
                  <span className="text-on-surface font-semibold">AES-256-GCM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Key Exchange:</span>
                  <span className="text-on-surface font-semibold">Curve25519</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Anchor Verify:</span>
                  <span className="text-secondary font-bold">PASS (30s ago)</span>
                </div>
              </div>

              <button className="mt-4 w-full border border-outline text-on-surface-variant font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg hover:bg-surface-variant hover:text-on-surface transition-all cursor-pointer flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Force Renew Handshake
              </button>
            </div>
          </div>
        </div>

        {/* Master Password Management Card */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col">
          <div className="flex items-center gap-2 mb-stack-md border-b border-outline-variant pb-stack-sm select-none">
            <Key className="w-5 h-5 text-tertiary-container fill-tertiary-container/10" />
            <h3 className="font-bold text-sm text-on-background">Master Authority</h3>
          </div>
          
          <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
            This master credentials password is required to disarm lockdown/emergency wipes. Keep it secure; it cannot be recovered.
          </p>

          <form onSubmit={handleUpdate} className="space-y-4 text-xs mt-auto">
            <div>
              <label className="block font-bold text-[10px] uppercase tracking-wider text-on-background mb-1">
                Current Password
              </label>
              <input
                type="password"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="••••••••••••"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-bold text-[10px] uppercase tracking-wider text-on-background mb-1">
                New Master Password
              </label>
              <input
                type="password"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Must be > 16 chars"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
            </div>

            {updateMsg && (
              <p className={`text-[10px] font-bold ${updateMsg.includes("success") ? "text-secondary" : "text-error"}`}>
                {updateMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-primary text-on-primary font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg hover:bg-on-primary-fixed-variant transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5 fill-on-primary/10" />
              {isUpdating ? "Updating..." : "Update Credentials"}
            </button>
          </form>
        </div>

      </div>

      {/* Supplementary Controls (Biometric, BLE mesh, threat logs snippet) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
        
        {/* Toggle Settings */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col justify-between">
          <h3 className="font-bold text-sm border-b border-outline-variant pb-stack-sm text-on-surface uppercase tracking-wider mb-2">
            Local Recovery Options
          </h3>
          
          <div className="divide-y divide-outline-variant text-xs">
            {/* Biometric */}
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-outline shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-on-surface">Require Biometric Authority</h4>
                  <p className="text-[10px] text-on-surface-variant">Verify identity on device controls</p>
                </div>
              </div>
              <button
                onClick={() => setBiometricEnabled(!biometricEnabled)}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  biometricEnabled ? "bg-secondary" : "bg-outline-variant"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                  biometricEnabled ? "right-1" : "left-1"
                }`}></div>
              </button>
            </div>

            {/* BLE Mesh */}
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bluetooth className="w-5 h-5 text-outline shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-on-surface">Offline BLE Mesh Routing</h4>
                  <p className="text-[10px] text-on-surface-variant">Allow anonymous localized peer syncing</p>
                </div>
              </div>
              <button
                onClick={onToggleBleMesh}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  bleMeshEnabled ? "bg-secondary" : "bg-outline-variant"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                  bleMeshEnabled ? "right-1" : "left-1"
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Threat Events Log Widget */}
        <div className="bg-surface-container-low border border-outline-variant border-dashed rounded-xl p-stack-md flex flex-col justify-between">
          <h3 className="font-bold text-sm border-b border-outline-variant pb-stack-sm text-on-surface uppercase tracking-wider mb-2">
            Threat Log Snippet
          </h3>
          <ul className="space-y-1.5 font-mono text-[10px] text-on-surface">
            <li className="flex justify-between items-center py-1 border-b border-outline-variant/30">
              <span className="text-secondary font-bold">SUCC</span>
              <span>Auth Handshake: SG-MAC-091</span>
              <span className="text-on-surface-variant">10:42 AM</span>
            </li>
            <li className="flex justify-between items-center py-1 border-b border-outline-variant/30">
              <span className="text-error font-bold">FAIL</span>
              <span>Token Mismatch: UNKNOWN_NODE</span>
              <span className="text-on-surface-variant">09:15 AM</span>
            </li>
            <li className="flex justify-between items-center py-1">
              <span className="text-secondary font-bold">SUCC</span>
              <span>Telemetric Sync: SG-MOB-442</span>
              <span className="text-on-surface-variant">Yesterday</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};
