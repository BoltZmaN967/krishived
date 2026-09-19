const LIFECYCLE = {
  reported: { label: 'Reported', color: 'bg-soil-200 text-canopy-800' },
  processing: { label: 'Processing', color: 'bg-soil-200 text-canopy-800' },
  ai_assessed: { label: 'AI assessed', color: 'bg-canopy-100 text-canopy-700' },
  under_validation: { label: 'Under review', color: 'bg-turmeric-100 text-turmeric-600' },
  confirmed: { label: 'Confirmed', color: 'bg-canopy-100 text-canopy-700' },
  advisory: { label: 'Advisory ready', color: 'bg-canopy-600 text-white' },
  follow_up: { label: 'Follow-up due', color: 'bg-turmeric-100 text-turmeric-600' },
  resolved: { label: 'Resolved', color: 'bg-soil-200 text-canopy-800' },
  monitoring: { label: 'Monitoring', color: 'bg-soil-200 text-canopy-800' },
};

export default function StatusPill({ status }) {
  const cfg = LIFECYCLE[status] || LIFECYCLE.reported;
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
