const CONFIG = {
  low: { label: 'Low risk', dot: 'bg-alert-low', text: 'text-alert-low', bg: 'bg-canopy-50' },
  moderate: { label: 'Moderate risk', dot: 'bg-alert-moderate', text: 'text-alert-moderate', bg: 'bg-turmeric-50' },
  high: { label: 'High risk', dot: 'bg-alert-high', text: 'text-alert-high', bg: 'bg-orange-50' },
  critical: { label: 'Critical', dot: 'bg-alert-critical', text: 'text-alert-critical', bg: 'bg-red-50' },
};

export default function RiskBadge({ level = 'low', size = 'md' }) {
  const cfg = CONFIG[level] || CONFIG.low;
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad} ${cfg.bg} ${cfg.text}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
