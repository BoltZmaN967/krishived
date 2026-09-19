import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ScanLine, Bell, CloudSun, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listFields, listCases, listAlerts, getWeather } from '../lib/api';
import RiskBadge from '../components/RiskBadge';
import StatusPill from '../components/StatusPill';
import StatCard from '../components/StatCard';

import howItWorksImg from '../assets/how-it-works.png';

export default function Dashboard() {
  const { farmer, user } = useAuth();
  const { t } = useLanguage();
  const [fields, setFields] = useState([]);
  const [cases, setCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const farmerId = farmer?.id || user?.id;
      const [f, c, a] = await Promise.all([
        listFields(farmerId),
        listCases(farmerId),
        listAlerts(farmerId),
      ]);
      if (!active) return;
      setFields(f);
      setCases(c);
      setAlerts(a);
      if (f[0]) {
        const w = await getWeather(f[0].lat, f[0].lng);
        if (active) setWeather(w);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [farmer, user]);

  const highestRisk = cases.find((c) => c.risk_level === 'critical' || c.risk_level === 'high') || cases[0];
  const openCases = cases.filter((c) => !['resolved'].includes(c.status));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div data-tour="welcome-card" className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-soil-400 font-medium">{t('welcome')}</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">
            {farmer?.full_name?.split(' ')[0] || 'Farmer'}
          </h1>
        </div>
      </div>

      {/* Primary action & 3-Step Process Card */}
      <Link
        to="/detect"
        data-tour="quick-detect"
        className="card p-4 sm:p-5 border-canopy-200 hover:border-canopy-400 hover:shadow-md transition-all group block space-y-3 sm:space-y-4 bg-gradient-to-b from-white to-canopy-50/20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-canopy-600 flex items-center justify-center shrink-0 group-hover:scale-105 shadow-md shadow-canopy-600/20 transition-transform">
              <ScanLine className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display font-bold text-base sm:text-lg text-ink">{t('quickDetect')}</p>
                <span className="text-[10px] sm:text-[11px] font-bold text-canopy-700 bg-canopy-100 px-2 sm:px-2.5 py-0.5 rounded-full">
                  AI Vision
                </span>
              </div>
              <p className="text-xs sm:text-sm text-soil-400 mt-0.5 line-clamp-1">{t('quickDetectSub')}</p>
            </div>
          </div>
          <div className="self-end sm:self-center flex items-center gap-1.5 text-canopy-700 font-bold text-xs sm:text-sm shrink-0 bg-white group-hover:bg-canopy-100 px-3 py-1.5 rounded-xl border border-canopy-200 transition-colors shadow-2xs">
            <span>Scan crop</span>
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 3-Step Workflow Image */}
        <div className="rounded-xl sm:rounded-2xl bg-white p-2 sm:p-4 border border-soil-200/80 shadow-xs overflow-hidden flex items-center justify-center">
          <img
            src={howItWorksImg}
            alt="How KrishiVed Works: 1. Take a picture of your crop, 2. See future disease risk, 3. Get treatment advice and medicine"
            className="w-full h-auto max-h-52 sm:max-h-64 md:max-h-72 object-contain my-1"
          />
        </div>
      </Link>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" data-tour="dashboard-stats">
        <StatCard icon={Sprout} label="Fields registered" value={fields.length} tone="canopy" />
        <StatCard icon={Bell} label="Active alerts" value={alerts.length} tone="turmeric" />
        {weather ? (
          <StatCard
            icon={CloudSun}
            label="Field weather"
            value={`${Math.round(weather.temp_c)}°C`}
            sub={`${weather.humidity_pct}% humidity`}
            tone="soil"
            className="col-span-2 sm:col-span-1"
          />
        ) : (
          <StatCard
            icon={CloudSun}
            label="Field weather"
            value="--"
            sub="No station"
            tone="soil"
            className="col-span-2 sm:col-span-1"
          />
        )}
      </div>

      {/* Two-column layout on desktop for active monitoring & alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left column: Highest Priority Case */}
        <div className="space-y-4">
          <section>
            <h2 className="text-sm sm:text-base font-bold mb-2.5 text-ink">{t('riskToday')}</h2>
            {highestRisk ? (
              <Link
                to={`/cases/${highestRisk.id}`}
                className="card p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 hover:border-canopy-300 transition-all hover:shadow-xs group"
              >
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-soil-100 flex items-center justify-center text-xl sm:text-2xl shrink-0 group-hover:scale-105 transition-transform">
                  {highestRisk.thumbnail || '🌿'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                    <RiskBadge level={highestRisk.risk_level} size="sm" />
                    <StatusPill status={highestRisk.status} />
                  </div>
                  <p className="font-semibold text-ink text-sm sm:text-base truncate group-hover:text-canopy-800 transition-colors">
                    {highestRisk.prediction}
                  </p>
                  <p className="text-xs sm:text-sm text-soil-400 truncate">
                    {highestRisk.field_name} · {highestRisk.crop}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-soil-400 group-hover:text-canopy-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ) : (
              <div className="card p-4 text-center">
                <p className="text-sm text-soil-400">No high-risk disease detected today.</p>
              </div>
            )}
          </section>

          {/* Open cases */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-ink">Open cases</h2>
              <Link to="/cases" className="text-xs sm:text-sm font-semibold text-canopy-700 hover:text-canopy-900 transition-colors">
                {t('viewAll')}
              </Link>
            </div>
            {openCases.length === 0 && !loading ? (
              <p className="text-xs sm:text-sm text-soil-400 card p-4">No open cases right now.</p>
            ) : (
              <div className="space-y-2">
                {openCases.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    to={`/cases/${c.id}`}
                    className="card p-3 sm:p-3.5 flex items-center gap-3 hover:border-canopy-200 transition-all hover:shadow-2xs group"
                  >
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-soil-100 flex items-center justify-center text-lg sm:text-xl shrink-0 group-hover:scale-105 transition-transform">
                      {c.thumbnail || '🌿'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink text-xs sm:text-sm truncate group-hover:text-canopy-800 transition-colors">
                        {c.prediction}
                      </p>
                      <p className="text-[11px] sm:text-xs text-soil-400 truncate">{c.field_name}</p>
                    </div>
                    <StatusPill status={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column: Alerts Preview */}
        <div>
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-ink">{t('alerts')}</h2>
              <Link to="/alerts" className="text-xs sm:text-sm font-semibold text-canopy-700 hover:text-canopy-900 transition-colors">
                {t('viewAll')}
              </Link>
            </div>
            {alerts.length === 0 && !loading ? (
              <p className="text-xs sm:text-sm text-soil-400 card p-4">{t('noAlerts')}</p>
            ) : (
              <div className="space-y-2.5">
                {alerts.slice(0, 4).map((a) => (
                  <div key={a.id} className="card p-3.5 sm:p-4 flex items-start gap-3 hover:border-soil-300 transition-colors">
                    <RiskBadge level={a.severity} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink text-xs sm:text-sm">{a.title}</p>
                      <p className="text-[11px] sm:text-xs text-soil-400 mt-0.5">{a.field_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
