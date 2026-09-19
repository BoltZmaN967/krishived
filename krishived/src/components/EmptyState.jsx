export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="card flex flex-col items-center text-center gap-3 py-12 px-6">
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-canopy-50 flex items-center justify-center">
          <Icon className="h-6 w-6 text-canopy-600" strokeWidth={2} />
        </div>
      )}
      <div>
        <p className="font-display font-bold text-ink">{title}</p>
        {body && <p className="text-sm text-soil-400 mt-1 max-w-xs">{body}</p>}
      </div>
      {action}
    </div>
  );
}
