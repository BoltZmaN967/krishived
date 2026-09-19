import { useState } from 'react';
import { LogOut, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTour } from '../context/TourContext';
import { upsertFarmerProfile } from '../lib/api';

export default function Profile() {
  const { farmer, user, setFarmer, signOut, isDemoMode } = useAuth();
  const { lang, setLang, supportedLanguages, labels } = useLanguage();
  const { startTour } = useTour();
  const [form, setForm] = useState({
    full_name: farmer?.full_name || '',
    village: farmer?.village || '',
    district: farmer?.district || '',
    state: farmer?.state || '',
    phone: farmer?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await upsertFarmerProfile(user?.id, form);
      setFarmer(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-extrabold">Profile</h1>

      <form onSubmit={handleSave} className="card p-5 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Village</label>
            <input className="input" value={form.village} onChange={(e) => update('village', e.target.value)} />
          </div>
          <div>
            <label className="label">District</label>
            <input className="input" value={form.district} onChange={(e) => update('district', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" value={form.state} onChange={(e) => update('state', e.target.value)} />
        </div>
        <div>
          <label className="label">Preferred language</label>
          <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
            {supportedLanguages.map((code) => (
              <option key={code} value={code}>
                {labels[code] || code}
              </option>
            ))}
          </select>
        </div>
        {user?.email && (
          <div className="pt-2 border-t border-soil-200 text-xs text-soil-500">
            Signed in as: <span className="font-semibold text-soil-700">{user.email}</span>
          </div>
        )}
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </form>

      <div className="space-y-3">
        <button
          type="button"
          onClick={startTour}
          className="btn-secondary w-full text-canopy-800 flex items-center justify-center gap-2 border-turmeric-300 bg-turmeric-50/70 hover:bg-turmeric-100 font-bold shadow-sm"
        >
          <Compass className="h-4 w-4 text-turmeric-600" /> Take App Tour
        </button>

        <button onClick={signOut} className="btn-secondary w-full text-alert-high flex items-center justify-center gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
