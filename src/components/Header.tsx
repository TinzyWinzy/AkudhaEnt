import { Layers, RefreshCw } from 'lucide-react';

interface HeaderProps {
  localInventory?: boolean;
  isOnline: boolean;
  serverAvailable: boolean;
  pendingCount: number;
  onSync: () => void;
}

export function Header({ localInventory, isOnline, serverAvailable, pendingCount, onSync }: HeaderProps) {
  return (
    <header className="border-b border-charcoal-200 bg-charcoal-900 px-6 py-4 text-white" id="header-navbar">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-ochre-500 p-2 text-charcoal-900">
            <Layers className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight">Akudha PWA</span>
              <span className="rounded bg-ochre-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-charcoal-900">ZIMBABWE v1.5</span>
            </div>
            <p className="text-xs text-charcoal-200">Agri-Logistics &amp; Informal Distribution Intelligence Engine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3" hidden={localInventory} style={localInventory ? { display: 'none' } : undefined}>
          <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors ${
            isOnline
              ? 'border-emerald-600/30 bg-emerald-950/40 text-emerald-300'
              : 'border-amber-600/30 bg-amber-950/40 text-amber-300'
          }`} id="status-badge-container">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              {isOnline ? 'Online Sync Active' : 'Offline Queue Mode'}
            </span>
            <span className={`hidden sm:inline text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
              serverAvailable ? 'text-emerald-400 bg-emerald-950/40' : 'text-charcoal-500 bg-charcoal-800'
            }`}>
              {serverAvailable ? 'API Live' : 'API Offline'}
            </span>
          </div>

          <button
            onClick={onSync}
            disabled={!isOnline || pendingCount === 0}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 font-mono text-xs font-bold tracking-tight transition-all uppercase ${
              pendingCount > 0 && isOnline
                ? 'bg-ochre-500 hover:bg-ochre-600 text-charcoal-900 shadow-md animate-pulse'
                : 'bg-charcoal-800 text-charcoal-500 cursor-not-allowed'
            }`}
            id="trigger-sync-button"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pendingCount > 0 && isOnline ? 'animate-spin' : ''}`} />
            Sync ({pendingCount})
          </button>
        </div>
      </div>
    </header>
  );
}
