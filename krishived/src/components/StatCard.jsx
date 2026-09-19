export default function StatCard({ icon: Icon, label, value, sub, tone = 'canopy', className = '' }) {
  const toneMap = {
    canopy: 'bg-canopy-50 text-canopy-700',
    turmeric: 'bg-turmeric-50 text-turmeric-600',
    soil: 'bg-soil-100 text-canopy-800',
  };
  return (
    <div className={`card p-3.5 sm:p-4 flex items-start gap-3 ${className}`}>
      <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-display font-extrabold text-ink leading-tight truncate">{value}</p>
        <p className="text-xs sm:text-sm text-soil-400 font-medium truncate">{label}</p>
        {sub && <p className="text-[11px] sm:text-xs text-canopy-700 mt-0.5 sm:mt-1 font-semibold truncate">{sub}</p>}
      </div>
    </div>
  );
}
