import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Hash, LogIn, ShieldCheck, UserCircle, X } from 'lucide-react';
import { Role } from '../../types/auth';
import { ZIM_REGIONS } from '../../constants';

interface LoginOverlayProps {
  open: boolean;
  onLogin: (staffId: string, pin: string) => Promise<void>;
  onDemoLogin: (role: Role, region?: string, hubId?: string) => void;
  onClose: () => void;
  onAuthenticated?: () => void;
}

const ROLE_OPTIONS: { role: Role; label: string; requiresRegion: boolean }[] = [
  { role: Role.FIELD_COORDINATOR, label: 'Field Coordinator', requiresRegion: true },
  { role: Role.PROCESSING_ADMIN, label: 'Processing Admin', requiresRegion: false },
  { role: Role.DISTRIBUTION_MANAGER, label: 'Distribution Manager', requiresRegion: false },
  { role: Role.SUPER_ADMIN, label: 'Super Admin', requiresRegion: false },
];

export function LoginOverlay({ open, onLogin, onDemoLogin, onClose, onAuthenticated }: LoginOverlayProps) {
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.SUPER_ADMIN);
  const [selectedRegion, setSelectedRegion] = useState('Chimanimani');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onLogin(staffId, pin);
      setPin('');
      onAuthenticated ? onAuthenticated() : onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const enterDemo = () => {
    const meta = ROLE_OPTIONS.find(item => item.role === selectedRole);
    onDemoLogin(selectedRole, meta?.requiresRegion ? selectedRegion : undefined);
    onAuthenticated ? onAuthenticated() : onClose();
  };

  return <AnimatePresence>{open && (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/80 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="sign-in-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-2xl" initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }}>
        <div className="flex items-start justify-between bg-charcoal-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-ochre-500 p-2 text-charcoal-900"><UserCircle className="h-6 w-6" /></div><div><h2 id="sign-in-title" className="font-display text-lg font-bold">Staff sign in</h2><p className="text-xs text-charcoal-300">Use the ID and PIN assigned by your administrator</p></div></div>
          <button type="button" aria-label="Close sign in" onClick={onClose} className="text-charcoal-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <label className="block space-y-2 text-xs font-bold uppercase tracking-wider text-charcoal-700">Staff ID<span className="relative block"><input type="text" autoComplete="username" value={staffId} onChange={event => setStaffId(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24))} className="block w-full rounded-lg border border-charcoal-200 bg-white py-2.5 pl-10 pr-3 font-mono text-sm font-normal normal-case tracking-wider focus:border-ochre-500 focus:outline-none" placeholder="AKU-ADMIN" autoFocus /><Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" /></span></label>
          <label className="block space-y-2 text-xs font-bold uppercase tracking-wider text-charcoal-700">Six-digit PIN<span className="relative block"><input type={showPin ? 'text' : 'password'} inputMode="numeric" pattern="[0-9]*" autoComplete="current-password" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={event => { if (event.key === 'Enter' && staffId.length >= 3 && pin.length === 6) void submit(); }} className="block w-full rounded-lg border border-charcoal-200 bg-white py-2.5 pl-10 pr-10 font-mono text-lg font-semibold tracking-[.35em] focus:border-ochre-500 focus:outline-none" aria-describedby="pin-security-note" /><ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" /><button type="button" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400">{showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          <p id="pin-security-note" className="text-xs leading-5 text-charcoal-500">PIN attempts are rate-limited. Never share your PIN with another staff member.</p>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
          <button type="button" disabled={busy || staffId.length < 3 || pin.length !== 6} onClick={() => void submit()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-ochre-500 hover:text-charcoal-900 disabled:opacity-50"><LogIn className="h-4 w-4" />{busy ? 'Signing in…' : 'Sign in securely'}</button>
          {import.meta.env.DEV && <div className="border-t border-charcoal-200 pt-4"><button type="button" onClick={() => setShowDemo(value => !value)} className="text-xs font-semibold text-charcoal-600 underline">{showDemo ? 'Hide local demo access' : 'Use local demo workspace'}</button>{showDemo && <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-900">Development only. This mode is excluded from production builds and cannot access protected APIs.</p><label className="block text-xs font-semibold">Demo role<select value={selectedRole} onChange={event => setSelectedRole(event.target.value as Role)} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm">{ROLE_OPTIONS.map(item => <option key={item.role} value={item.role}>{item.label}</option>)}</select></label>{selectedRole === Role.FIELD_COORDINATOR && <label className="block text-xs font-semibold">Region<select value={selectedRegion} onChange={event => setSelectedRegion(event.target.value)} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm">{ZIM_REGIONS.map(region => <option key={region}>{region}</option>)}</select></label>}<button type="button" onClick={enterDemo} className="w-full rounded-lg border border-amber-400 bg-white py-2 text-xs font-bold uppercase text-amber-900">Continue locally</button></div>}</div>}
        </div>
      </motion.section>
    </motion.div>
  )}</AnimatePresence>;
}
