import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserCircle, X, Lock, Eye, EyeOff } from 'lucide-react';
import { Role, type UserClaims } from '../../types/auth';
import { ZIM_REGIONS } from '../../constants';

interface LoginOverlayProps {
  open: boolean;
  onLogin: (role: Role, region?: string, hubId?: string) => void;
  onClose: () => void;
}

const DEMO_PIN = '4242';

const ROLE_OPTIONS: { role: Role; label: string; description: string; requiresRegion: boolean }[] = [
  { role: Role.FIELD_COORDINATOR, label: 'Field Coordinator', description: 'Rural collection agent — Chimanimani region', requiresRegion: true },
  { role: Role.PROCESSING_ADMIN, label: 'Processing Admin', description: 'Factory floor supervisor — global vault access', requiresRegion: false },
  { role: Role.DISTRIBUTION_MANAGER, label: 'Distribution Manager', description: 'Hub dispatch manager — vendor consignments', requiresRegion: false },
  { role: Role.SUPER_ADMIN, label: 'Super Admin', description: 'Full system access — all modules', requiresRegion: false },
];

export function LoginOverlay({ open, onLogin, onClose }: LoginOverlayProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(Role.FIELD_COORDINATOR);
  const [selectedRegion, setSelectedRegion] = useState('Chimanimani');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleLogin = () => {
    if (pin !== DEMO_PIN) {
      setPinError(true);
      return;
    }
    setPinError(false);
    if (selectedRole === Role.FIELD_COORDINATOR) {
      onLogin(selectedRole, selectedRegion);
    } else {
      onLogin(selectedRole);
    }
    setPin('');
    onClose();
  };

  const roleMeta = ROLE_OPTIONS.find(r => r.role === selectedRole);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-charcoal-200 overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="bg-charcoal-900 px-6 py-5 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-ochre-500 p-2 text-charcoal-900">
                  <UserCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">Akudha Access Portal</h2>
                  <p className="text-xs text-charcoal-300">Secure demo environment</p>
                </div>
              </div>
              <button onClick={onClose} className="text-charcoal-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider">Role</label>
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.role}
                    onClick={() => setSelectedRole(opt.role)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedRole === opt.role
                        ? 'border-ochre-500 bg-ochre-50 ring-1 ring-ochre-500'
                        : 'border-charcoal-200 hover:bg-charcoal-50'
                    }`}
                  >
                    <span className="block font-semibold text-sm text-charcoal-900">{opt.label}</span>
                    <span className="block text-xs text-charcoal-600 mt-0.5">{opt.description}</span>
                  </button>
                ))}
              </div>

              {roleMeta?.requiresRegion && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider">Assigned Region</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none"
                  >
                    {ZIM_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider">Demo PIN</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                    placeholder="Enter demo PIN"
                    className={`w-full rounded-lg border pl-10 pr-10 py-2 text-sm bg-white focus:outline-none ${
                      pinError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-charcoal-200 focus:border-ochre-500'
                    }`}
                    autoFocus
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pinError && <p className="text-xs text-rose-600 mt-1">Invalid PIN. Please try again.</p>}
              </div>

              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-sm font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider"
              >
                <LogIn className="h-4 w-4" />
                Enter Akudha as {roleMeta?.label ?? selectedRole}
              </button>
            </div>

            <div className="bg-charcoal-50 px-6 py-3 border-t border-charcoal-200">
              <p className="text-[10px] text-charcoal-500 text-center">
                Secure demo environment — authorised access only. PIN: 4242
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
