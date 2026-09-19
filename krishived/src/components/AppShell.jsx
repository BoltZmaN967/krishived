import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Sprout,
  ScanLine,
  ClipboardList,
  Bell,
  User,
  Leaf,
  Compass,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTour } from '../context/TourContext';
import AppTour from './AppTour';

const NAV_ITEMS = [
  { to: '/', icon: Home, key: 'dashboard', tourId: 'nav-dashboard' },
  { to: '/fields', icon: Sprout, key: 'fields', tourId: 'nav-fields' },
  { to: '/detect', icon: ScanLine, key: 'detect', tourId: 'nav-detect' },
  { to: '/cases', icon: ClipboardList, key: 'cases', tourId: 'nav-cases' },
  { to: '/alerts', icon: Bell, key: 'alerts', tourId: 'nav-alerts' },
];

function NavItem({ to, icon: Icon, label, mobile, tourId }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      data-tour={tourId}
      className={({ isActive }) =>
        mobile
          ? `flex flex-col items-center justify-center gap-1 py-2 flex-1 text-xs font-semibold ${
              isActive ? 'text-canopy-700' : 'text-soil-400'
            }`
          : `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
              isActive
                ? 'bg-canopy-600 text-white shadow-sm'
                : 'text-canopy-800 hover:bg-canopy-50'
            }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2.1} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { t, lang, setLang, supportedLanguages, labels, isTranslating } = useLanguage();
  const { farmer, isDemoMode } = useAuth();
  const { startTour } = useTour();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-soil-50">
      {/* App Onboarding Tour Overlay */}
      <AppTour />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-soil-200/90 bg-white px-4 py-5 shadow-sm z-30">
        {/* Brand Logo Header */}
        <div className="px-2 mb-6">
          <NavLink
            to="/"
            className="flex items-center gap-2 group transition-transform active:scale-[0.98]"
            title="KrishiVed Home"
          >
            <img
              src="/assets/logo-transparent.png"
              alt="KrishiVed"
              className="h-9 w-auto max-w-[185px] object-contain transition-transform group-hover:scale-[1.02]"
            />
          </NavLink>
          <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-canopy-500 animate-pulse" />
            <p className="text-[11px] text-soil-400 font-semibold tracking-wide uppercase">
              AI Crop Diagnostics
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={t(item.key)}
              tourId={item.tourId}
            />
          ))}
        </nav>

        {/* Sidebar Tour Trigger Button */}
        <div className="mt-4 px-1">
          <button
            type="button"
            onClick={startTour}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-turmeric-50 hover:bg-turmeric-100/80 text-turmeric-800 border border-turmeric-200/80 text-xs font-bold transition-all shadow-sm group"
          >
            <Compass className="h-4 w-4 text-turmeric-600 group-hover:rotate-45 transition-transform" />
            <span>Take App Tour</span>
          </button>
        </div>

        <div className="mt-auto pt-5 border-t border-soil-200">
          <button
            onClick={() => navigate('/profile')}
            data-tour="user-profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full hover:bg-soil-100/80 transition-colors text-left group"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-canopy-100 to-turmeric-100 border border-canopy-200/60 flex items-center justify-center text-canopy-800 font-bold shadow-xs">
              {(farmer?.full_name || 'F')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate group-hover:text-canopy-800 transition-colors">
                {farmer?.full_name || 'Your profile'}
              </p>
              <p className="text-xs text-soil-400 truncate">
                {farmer?.village ? `${farmer.village}, ${farmer.district}` : t('profile')}
              </p>
            </div>
          </button>
          {isDemoMode && (
            <p className="mt-2.5 text-[11px] leading-snug text-turmeric-700 bg-turmeric-50 border border-turmeric-200/60 rounded-lg px-2.5 py-2">
              Demo mode — connect Supabase in .env to use live data.
            </p>
          )}
        </div>
      </aside>

      {/* Top bar (all sizes) */}
      <header className="lg:pl-64 sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-soil-200/80">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16">
          {/* Mobile Logo Brand */}
          <div className="flex items-center gap-2 lg:hidden">
            <NavLink to="/" className="flex items-center gap-2 py-1">
              <img
                src="/assets/logo-transparent.png"
                alt="KrishiVed"
                className="h-7 w-auto max-h-7 object-contain"
              />
            </NavLink>
          </div>

          {/* Desktop Left context indicator */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-soil-100/70 border border-soil-200/60 rounded-full text-xs font-semibold text-soil-600">
              <span className="h-2 w-2 rounded-full bg-canopy-500" />
              <span>Smart Farm Diagnostic System</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Quick Demo Guide trigger */}
            <button
              type="button"
              onClick={startTour}
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-canopy-800 bg-white border border-soil-300 hover:border-canopy-400 rounded-full p-2 sm:px-3.5 sm:py-1.5 shadow-xs hover:bg-canopy-50/60 transition-all cursor-pointer"
              title="Explore Section Demo Guide"
              aria-label="Demo Guide"
            >
              <Compass className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-turmeric-600" />
              <span className="hidden sm:inline">Demo Guide</span>
            </button>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5" data-tour="language-select">
              <label className="flex items-center gap-2">
                <span className="sr-only">Language</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="text-sm font-semibold bg-white border border-soil-300 rounded-full px-3 py-1.5 text-canopy-800 shadow-xs cursor-pointer hover:border-canopy-400 transition-colors"
                >
                  {supportedLanguages.map((code) => (
                    <option key={code} value={code}>
                      {labels[code] || code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              {isTranslating && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-canopy-700 bg-canopy-50 border border-canopy-200 rounded-full px-2.5 py-1 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin text-canopy-600" />
                  <span>Translating…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64 pb-24 lg:pb-10">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-soil-200 flex safe-area-bottom">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={t(item.key)}
            mobile
            tourId={item.tourId}
          />
        ))}
      </nav>
    </div>
  );
}
