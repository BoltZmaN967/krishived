import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listAlerts } from '../lib/api';
import RiskBadge from '../components/RiskBadge';
import EmptyState from '../components/EmptyState';

export default function Alerts() {
  const { farmer, user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const farmerId = farmer?.id || user?.id;

  useEffect(() => {
    listAlerts(farmerId).then((a) => {
      setAlerts(a);
      setLoading(false);
    });
  }, [farmerId]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Alerts</h1>

      {!loading && alerts.length === 0 && (
        <EmptyState icon={Bell} title="No active alerts" body="You'll be notified here when conditions raise risk for one of your fields." />
      )}

      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <RiskBadge level={a.severity} size="sm" />
              <span className="text-xs text-soil-400">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
            <p className="font-display font-bold text-ink">{a.title}</p>
            <p className="text-sm text-soil-400 mt-1">{a.detail}</p>
            <p className="text-xs font-semibold text-canopy-700 mt-2">{a.field_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
