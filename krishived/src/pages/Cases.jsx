import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listCases } from '../lib/api';
import RiskBadge from '../components/RiskBadge';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';

const FILTERS = ['All', 'Open', 'Resolved'];

export default function Cases() {
  const { farmer, user } = useAuth();
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const farmerId = farmer?.id || user?.id;

  useEffect(() => {
    listCases(farmerId).then((c) => {
      setCases(c);
      setLoading(false);
    });
  }, [farmerId]);

  const visible = cases.filter((c) => {
    if (filter === 'Open') return c.status !== 'resolved';
    if (filter === 'Resolved') return c.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Case history</h1>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f ? 'bg-canopy-600 text-white' : 'bg-white border border-soil-300 text-canopy-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!loading && visible.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No cases here"
          body="Once you check a plant, it will show up here with its status and history."
        />
      )}

      <div className="space-y-2">
        {visible.map((c) => (
          <Link key={c.id} to={`/cases/${c.id}`} className="card p-4 flex items-center gap-4 block">
            <div className="h-12 w-12 rounded-xl bg-soil-100 flex items-center justify-center text-2xl shrink-0">
              {c.thumbnail || '🌿'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <RiskBadge level={c.risk_level} size="sm" />
                <StatusPill status={c.status} />
              </div>
              <p className="font-semibold text-ink text-sm truncate">{c.prediction}</p>
              <p className="text-xs text-soil-400">
                {c.field_name} · {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
