import { Database, Layers, Truck, Settings, BookOpen, Brain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export type TabId = 'harvest' | 'process' | 'distribute' | 'diagnostics' | 'backlog' | 'schemas' | 'ai';

const ALL_TABS: { id: TabId; label: string; icon: typeof Database }[] = [
  { id: 'harvest', label: 'Sourcing', icon: Database },
  { id: 'process', label: 'Processing', icon: Layers },
  { id: 'distribute', label: 'Logistics', icon: Truck },
  { id: 'diagnostics', label: 'Audit', icon: Settings },
  { id: 'backlog', label: 'Agile Backlog', icon: BookOpen },
  { id: 'schemas', label: 'DB Schemas', icon: Database },
  { id: 'ai', label: 'AI Agents', icon: Brain },
];

const VISIBLE_TABS: Record<string, TabId[]> = {
  field_coordinator: ['harvest', 'backlog'],
  processing_admin: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
  distribution_manager: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
  super_admin: ['harvest', 'process', 'distribute', 'diagnostics', 'schemas', 'backlog', 'ai'],
};

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const { user } = useAuth();
  const visibleTabs = user ? VISIBLE_TABS[user.role] ?? ALL_TABS.map(t => t.id) : ALL_TABS.map(t => t.id);
  const tabs = ALL_TABS.filter(t => visibleTabs.includes(t.id));

  if (tabs.length === 0) return null;

  return (
    <div className="flex flex-wrap border-b border-charcoal-200 bg-white rounded-t-xl" id="tab-navigation-row">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === id
              ? 'border-ochre-500 text-ochre-700 font-bold bg-ochre-50/20'
              : 'border-transparent text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-50'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
