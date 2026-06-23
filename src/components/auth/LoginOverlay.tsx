import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserCircle, X } from 'lucide-react';
import { Role, type UserClaims } from '../../types/auth';
import { ZIM_REGIONS } from '../../constants';

interface LoginOverlayProps {
  open: boolean;
  onLogin: (role: Role, region?: string, hubId?: string) => void;
  onClose: () => void;
}

const ROLE_OPTIONS: { role: Role; label: string; description: string; requiresRegion: boolean }[] = [
  { role: Role.FIELD_COORDINATOR, label: 'Field Coordinator', description: 'Rural collection agent — Chimanimani region', requiresRegion: true },
  { role: Role.PROCESSING_ADMIN, label: 'Processing Admin', description: 'Factory floor supervisor — global vault access', requiresRegion: false },
  { role: Role.DISTRIBUTION_MANAGER, label: 'Distribution Manager', description: 'Hub dispatch manager — vendor consignments', requiresRegion: false },
  { role: Role.SUPER_ADMIN, label: 'Super Admin', description: 'Full system access — all modules', requiresRegion: false },
];

export function LoginOverlay({ open, onLogin, onClose }: LoginOverlayProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(Role.FIELD_COORDINATOR);
  const [selectedRegion, setSelectedRegion] = useState('Chimanimani');

  const handleLogin = () => {
    if (selectedRole === Role.FIELD_COORDINATOR) {
      onLogin(selectedRole, selectedRegion);
    } else {
      onLogin(selectedRole);
    }
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
                  <p className="text-xs text-charcoal-300">Select your operational role to continue</p>
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
                Demo mode — no authentication required. Role determines data visibility.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
