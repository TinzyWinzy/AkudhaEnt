import { Layers, TrendingUp, HardDrive, DollarSign } from 'lucide-react';

interface DashboardCardsProps {
  rawPulpStockKg: number;
  processedSachetsStock: number;
  totalEthicalPayoutUSD: number;
  totalVendorRevenueUSD: number;
  totalHarvestedKg: number;
  totalSachetsDistributed: number;
  totalSachetsSold: number;
}

export function DashboardCards({
  rawPulpStockKg,
  processedSachetsStock,
  totalEthicalPayoutUSD,
  totalVendorRevenueUSD,
  totalHarvestedKg,
  totalSachetsDistributed,
  totalSachetsSold,
}: DashboardCardsProps) {
  const cards = [
    {
      id: 'vault-pulp-stat',
      title: 'Raw Baobab Pulp Vault',
      badge: 'Storage',
      badgeClass: 'bg-ochre-50 text-ochre-700',
      value: rawPulpStockKg.toFixed(1),
      unit: 'KG',
      desc: 'Unprocessed gold harvested from 5 dryland regions.',
      footer: `+${totalHarvestedKg.toFixed(1)} kg`,
      barColor: 'bg-ochre-400',
      barWidth: Math.min(100, (rawPulpStockKg / 1000) * 100),
      icon: <HardDrive className="h-5 w-5 text-ochre-600" />,
    },
    {
      id: 'vault-sachets-stat',
      title: 'Produced 175ml Sachets',
      badge: 'Vault Fins',
      badgeClass: 'bg-blue-50 text-blue-700',
      value: processedSachetsStock.toString(),
      unit: 'Units',
      desc: 'Packaged beverage containers stored and ready for dispatch.',
      footer: processedSachetsStock < 100 ? `${processedSachetsStock} units (low)` : `${processedSachetsStock} units`,
      footerClass: processedSachetsStock < 100 ? 'text-amber-600' : 'text-emerald-600',
      barColor: 'bg-blue-400',
      barWidth: Math.min(100, (processedSachetsStock / 2000) * 100),
      icon: <Layers className="h-5 w-5 text-blue-600" />,
    },
    {
      id: 'payout-stewardship-stat',
      title: 'Ethical Harvester Payouts',
      badge: 'Impact',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      value: totalEthicalPayoutUSD.toFixed(2),
      unit: 'USD',
      prefix: '$',
      desc: 'Direct premium income paid to remote rural gatherers.',
      footer: '5 out of 5 regions active',
      barColor: 'bg-emerald-500',
      barWidth: 100,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
    },
    {
      id: 'vendor-margins-stat',
      title: 'Active Vendor Hub Turnover',
      badge: 'Retail',
      badgeClass: 'bg-purple-50 text-purple-700',
      value: totalVendorRevenueUSD.toFixed(2),
      unit: 'USD',
      prefix: '$',
      desc: 'Consumer retail volume generated of $0.50 per sachet.',
      footer: `${totalSachetsSold} / ${totalSachetsDistributed} dispatched`,
      barColor: 'bg-purple-500',
      barWidth: 100,
      icon: <DollarSign className="h-5 w-5 text-purple-600" />,
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => (
        <div key={card.id} className="relative overflow-hidden rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id={card.id}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal-700 uppercase tracking-wider">{card.title}</span>
            <span className={`rounded-full px-2 py-1 font-mono text-xs font-bold ${card.badgeClass}`}>{card.badge}</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            {card.prefix && <span className="font-mono text-sm text-charcoal-700">{card.prefix}</span>}
            <span className="font-display text-4xl font-bold tracking-tight text-charcoal-900">{card.value}</span>
            <span className="font-mono text-sm text-charcoal-700">{card.unit}</span>
          </div>
          <div className="mt-2 text-xs text-charcoal-700">{card.desc}</div>
          <div className="mt-3 flex items-center justify-between gap-1 border-t border-charcoal-100 pt-2 text-[11px]">
            <span className="text-gray-500 uppercase">Total:</span>
            <span className={`font-mono font-semibold text-charcoal-900 ${card.footerClass || ''}`}>{card.footer}</span>
          </div>
          <div className={`absolute bottom-0 left-0 h-1 ${card.barColor} transition-all`} style={{ width: `${card.barWidth}%` }} />
        </div>
      ))}
    </div>
  );
}
