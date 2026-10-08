import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Boxes, ChevronDown, ClipboardList, Factory, Home, Leaf, LogOut, Menu, PackageSearch, RefreshCw, Settings, Truck, X } from 'lucide-react';
import { Role, type UserClaims } from '../types/auth';
import { APP_ROUTE_PATH, type AppRoute } from '../lib/appRoutes';

interface AppShellProps {
  user: UserClaims;
  route: AppRoute;
  isOnline: boolean;
  serverAvailable: boolean | null;
  syncState: 'checking' | 'saved' | 'waiting' | 'syncing' | 'attention' | 'offline';
  onNavigate: (path: string) => void;
  onSync: () => void;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

interface Destination {
  route: AppRoute;
  label: string;
  description: string;
  icon: typeof Home;
}

const ALL_DESTINATIONS: Destination[] = [
  { route: 'home', label: 'Today', description: 'Work queue and overview', icon: Home },
  { route: 'inventory', label: 'Inventory', description: 'Products, lots and labels', icon: Boxes },
  { route: 'harvest', label: 'Sourcing', description: 'Harvest intake and records', icon: ClipboardList },
  { route: 'process', label: 'Processing', description: 'Production and yield', icon: Factory },
  { route: 'distribute', label: 'Distribution', description: 'Dispatches and returns', icon: Truck },
  { route: 'operations', label: 'Operations', description: 'Audit, sync and administration', icon: Settings },
];

const ROLE_LABELS: Record<Role, string> = {
  [Role.FIELD_COORDINATOR]: 'Field coordinator',
  [Role.PROCESSING_ADMIN]: 'Processing administrator',
  [Role.DISTRIBUTION_MANAGER]: 'Distribution manager',
  [Role.SUPER_ADMIN]: 'System administrator',
};

function destinationsFor(user: UserClaims) {
  return ALL_DESTINATIONS.filter(item => {
    if (item.route === 'home') return true;
    if (item.route === 'operations') return user.role === Role.SUPER_ADMIN;
    if (item.route === 'inventory') return user.role !== Role.FIELD_COORDINATOR;
    if (item.route === 'harvest') return true;
    if (item.route === 'process') return user.role !== Role.FIELD_COORDINATOR;
    return user.role === Role.DISTRIBUTION_MANAGER || user.role === Role.PROCESSING_ADMIN || user.role === Role.SUPER_ADMIN;
  });
}

function SyncStatus({ syncState, onSync }: Pick<AppShellProps, 'syncState' | 'onSync'>) {
  const statuses = {
    checking: { label: 'Checking connection', dot: 'bg-ink-muted', tone: 'text-ink-muted bg-surface-muted border-line' },
    saved: { label: 'Saved', dot: 'bg-status-success', tone: 'text-status-success bg-status-success-soft border-status-success/20' },
    waiting: { label: 'Waiting to sync', dot: 'bg-status-warning', tone: 'text-status-warning-ink bg-status-warning-soft border-status-warning/25' },
    syncing: { label: 'Syncing', dot: 'bg-brand', tone: 'text-brand-strong bg-brand-soft border-brand/25' },
    attention: { label: 'Needs attention', dot: 'bg-status-danger', tone: 'text-status-danger bg-status-danger-soft border-status-danger/20' },
    offline: { label: 'Offline ready', dot: 'bg-status-warning', tone: 'text-status-warning-ink bg-status-warning-soft border-status-warning/25' },
  } as const;
  const status = statuses[syncState];

  return <div className={`flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold ${status.tone}`} aria-live="polite">
    <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
    <span>{status.label}</span>
    {(syncState === 'waiting' || syncState === 'attention') && <button type="button" onClick={onSync} className="ml-1 inline-flex min-h-8 items-center gap-1 rounded-control px-2 text-sm underline decoration-current/35 underline-offset-4 hover:no-underline"><RefreshCw className="h-4 w-4" /> Sync</button>}
  </div>;
}

export function AppShell({ user, route, syncState, onNavigate, onSync, onLogout, children }: AppShellProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const destinations = destinationsFor(user);
  const mobilePrimary = destinations.length > 5 ? destinations.slice(0, 4) : destinations;
  const mobileMore = destinations.length > 5 ? destinations.slice(4) : [];
  const current = destinations.find(item => item.route === route) ?? destinations[0];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const navigate = (item: Destination) => {
    setMoreOpen(false);
    onNavigate(APP_ROUTE_PATH[item.route]);
  };

  return <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-brand selection:text-white">
    <a href="#main-content" className="sr-only z-[100] rounded-control bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <button type="button" onClick={() => onNavigate('/app')} className="flex min-h-11 items-center gap-3 text-left focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand">
          <span className="grid h-10 w-10 place-items-center rounded-surface bg-ink text-brand-soft"><Leaf className="h-5 w-5" /></span>
          <span><strong className="block font-display text-lg leading-tight">Akudha Operations</strong><span className="hidden text-sm text-ink-muted sm:block">{current.description}</span></span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><SyncStatus syncState={syncState} onSync={onSync} /></div>
          <div className="relative" ref={accountRef}>
            <button type="button" aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen(value => !value)} className="flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-3 text-left hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold text-ink">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden max-w-40 sm:block"><strong className="block truncate text-sm">{user.name}</strong><span className="block truncate text-xs text-ink-muted">{user.region || ROLE_LABELS[user.role]}</span></span>
              <ChevronDown className="h-4 w-4 text-ink-muted" />
            </button>
            {accountOpen && <div role="menu" className="absolute right-0 mt-2 w-64 rounded-surface border border-line bg-surface p-2 shadow-frost">
              <div className="border-b border-line px-3 py-3"><p className="font-semibold">{user.name}</p><p className="mt-1 font-mono text-sm text-ink-muted">{user.staffId}</p><p className="mt-1 text-sm text-ink-muted">{ROLE_LABELS[user.role]}</p></div>
              <button role="menuitem" type="button" onClick={() => void onLogout()} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-sm font-semibold text-status-danger hover:bg-status-danger-soft"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>}
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 py-2 sm:hidden"><SyncStatus syncState={syncState} onSync={onSync} /></div>
    </header>

    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-line bg-surface px-4 py-6 lg:block">
        <nav aria-label="Primary navigation" className="sticky top-22 space-y-1">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Workspace</p>
          {destinations.map(item => { const Icon = item.icon; const active = route === item.route; return <button key={item.route} type="button" aria-current={active ? 'page' : undefined} onClick={() => navigate(item)} className={`group flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? 'bg-brand-soft text-ink shadow-inset' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}><Icon className={`h-5 w-5 ${active ? 'text-brand-strong' : ''}`} /><span><strong className="block text-sm">{item.label}</strong><span className="block text-xs font-normal text-ink-muted">{item.description}</span></span></button>; })}
        </nav>
      </aside>

      <main id="main-content" className="min-w-0 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-12">
        {children}
      </main>
    </div>

    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface/97 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(24,38,29,.08)] backdrop-blur-xl lg:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(5, mobilePrimary.length + (mobileMore.length ? 1 : 0))}, minmax(0, 1fr))` }}>
      {mobilePrimary.map(item => { const Icon = item.icon; const active = route === item.route; return <button key={item.route} type="button" aria-current={active ? 'page' : undefined} onClick={() => navigate(item)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-control px-1 text-xs font-semibold ${active ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted'}`}><Icon className="h-5 w-5" /><span className="truncate">{item.label}</span></button>; })}
      {mobileMore.length > 0 && <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-control px-1 text-xs font-semibold ${mobileMore.some(item => item.route === route) ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted'}`}><Menu className="h-5 w-5" />More</button>}
    </nav>

    {moreOpen && <div className="fixed inset-0 z-50 bg-ink/45 p-4 backdrop-blur-sm lg:hidden" onClick={() => setMoreOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="more-title" onClick={event => event.stopPropagation()} className="absolute inset-x-3 bottom-3 rounded-surface border border-line bg-surface p-4 shadow-frost">
        <div className="mb-3 flex items-center justify-between"><h2 id="more-title" className="font-display text-xl font-semibold">More</h2><button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="grid h-11 w-11 place-items-center rounded-control hover:bg-surface-muted"><X className="h-5 w-5" /></button></div>
        {mobileMore.map(item => { const Icon = item.icon; return <button key={item.route} type="button" onClick={() => navigate(item)} className="flex min-h-14 w-full items-center gap-3 rounded-control px-3 text-left hover:bg-surface-muted"><Icon className="h-5 w-5 text-brand-strong" /><span><strong className="block">{item.label}</strong><span className="text-sm text-ink-muted">{item.description}</span></span></button>; })}
      </section>
    </div>}
  </div>;
}
