import { AlertTriangle } from 'lucide-react';

interface PendingBannerProps {
  pendingCount: number;
  isOnline: boolean;
  serverAvailable: boolean;
  onSync: () => void;
}

export function PendingBanner({ pendingCount, isOnline, serverAvailable, onSync }: PendingBannerProps) {
  if (pendingCount === 0) return null;

  return (
    <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row" id="pending-items-banner">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
        <div>
          <h4 className="font-display font-bold text-amber-900">You have {pendingCount} un-synchronized data payloads queued locally</h4>
          <p className="text-xs text-amber-700">Transactions are cached locally. Complete synchronization on network recovery.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <button onClick={onSync} className="rounded-lg bg-ochre-500 px-4 py-2 font-mono text-xs font-bold text-charcoal-900 hover:bg-ochre-600 transition-colors shadow-sm" id="sync-now-banner-button">
            {serverAvailable ? 'SYNC TO SERVER' : 'COMMIT LOCALLY'}
          </button>
        ) : (
          <span className="rounded bg-amber-200 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-800">NETWORK INTERRUPT: SWITCH ONLINE TO SYNC</span>
        )}
      </div>
    </div>
  );
}
