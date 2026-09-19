import { useEffect, useState } from 'react';
import { Plus, MapPin, Sprout, X, LocateFixed, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listFields, createField } from '../lib/api';
import EmptyState from '../components/EmptyState';

const STAGES = ['Sowing', 'Vegetative', 'Flowering', 'Fruiting', 'Boll development', 'Maturity', 'Harvest'];

function FieldForm({ onClose, onSaved, farmerId }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    crop: '',
    variety: '',
    sowing_date: '',
    crop_stage: STAGES[0],
    area_acres: '',
    soil_type: '',
    lat: null,
    lng: null,
  });
  const [saving, setSaving] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | detecting | done | error

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('lat', pos.coords.latitude);
        update('lng', pos.coords.longitude);
        setGeoStatus('done');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createField(farmerId, {
        ...form,
        area_acres: form.area_acres ? Number(form.area_acres) : null,
      });
      onSaved(created);
    } finally {
      setSaving(false);
    }
  }

  // OpenStreetMap embed URL for preview
  const mapSrc =
    form.lat && form.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${form.lng - 0.01},${form.lat - 0.01},${form.lng + 0.01},${form.lat + 0.01}&layer=mapnik&marker=${form.lat},${form.lng}`
      : null;

  return (
    <div className="fixed inset-0 z-30 bg-ink/40 flex items-end lg:items-center justify-center p-0 lg:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full lg:max-w-md rounded-t-3xl lg:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('addField')}</h2>
          <button type="button" onClick={onClose} className="p-1 text-soil-400 hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="label">{t('fieldName')}</label>
          <input
            className="input"
            placeholder="e.g. North plot"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('crop')}</label>
            <input className="input" required value={form.crop} onChange={(e) => update('crop', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('variety')}</label>
            <input className="input" value={form.variety} onChange={(e) => update('variety', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('sowingDate')}</label>
            <input
              type="date"
              className="input"
              value={form.sowing_date}
              onChange={(e) => update('sowing_date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('cropStage')}</label>
            <select className="input" value={form.crop_stage} onChange={(e) => update('crop_stage', e.target.value)}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('area')}</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.area_acres}
              onChange={(e) => update('area_acres', e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('soilType')}</label>
            <input className="input" value={form.soil_type} onChange={(e) => update('soil_type', e.target.value)} />
          </div>
        </div>

        {/* ── GPS Location ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="label flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-canopy-600" />
            Field Location (GPS)
          </label>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={geoStatus === 'detecting'}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              geoStatus === 'done'
                ? 'bg-canopy-50 border-canopy-300 text-canopy-700'
                : geoStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'border-soil-300 text-canopy-700 hover:bg-canopy-50'
            }`}
          >
            <LocateFixed
              className={`h-4 w-4 ${geoStatus === 'detecting' ? 'animate-spin' : ''}`}
            />
            {geoStatus === 'detecting'
              ? t('detectingLocation')
              : geoStatus === 'done'
              ? `${t('locationCaptured')} · ${form.lat?.toFixed(4)}, ${form.lng?.toFixed(4)}`
              : geoStatus === 'error'
              ? t('locationError')
              : t('useMyLocation')}
          </button>

          {/* Manual lat/lng inputs (always visible for editing) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-soil-400 mb-0.5 block">Latitude</label>
              <input
                type="number"
                step="0.000001"
                className="input text-sm"
                placeholder="e.g. 18.5204"
                value={form.lat ?? ''}
                onChange={(e) => update('lat', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="text-[11px] text-soil-400 mb-0.5 block">Longitude</label>
              <input
                type="number"
                step="0.000001"
                className="input text-sm"
                placeholder="e.g. 73.8567"
                value={form.lng ?? ''}
                onChange={(e) => update('lng', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          {/* OpenStreetMap preview */}
          {mapSrc && (
            <div className="rounded-xl overflow-hidden border border-soil-200 shadow-sm">
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-soil-50 border-b border-soil-200">
                <Map className="h-3.5 w-3.5 text-soil-400" />
                <span className="text-xs text-soil-400 font-medium">{t('mapPreview')}</span>
              </div>
              <iframe
                title="Field map"
                src={mapSrc}
                className="w-full h-40"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
          {saving ? t('saving') : t('saveField')}
        </button>
      </form>
    </div>
  );
}

export default function Fields() {
  const { farmer, user } = useAuth();
  const { t } = useLanguage();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const farmerId = farmer?.id || user?.id;

  useEffect(() => {
    listFields(farmerId).then((f) => {
      setFields(f);
      setLoading(false);
    });
  }, [farmerId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('myFields')}</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary !px-4 !py-2.5 text-sm">
          <Plus className="h-4 w-4" /> {t('addField')}
        </button>
      </div>

      {!loading && fields.length === 0 && (
        <EmptyState
          icon={Sprout}
          title={t('noFieldsYet')}
          body={t('noFieldsBody')}
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              {t('addField')}
            </button>
          }
        />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display font-bold text-ink">{f.name}</p>
                <p className="text-sm text-soil-400">{f.crop} · {f.variety}</p>
              </div>
              <span className="text-xs font-semibold bg-canopy-50 text-canopy-700 rounded-full px-2.5 py-1">
                {f.crop_stage}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-soil-400 text-xs">{t('area')}</p>
                <p className="font-semibold">{f.area_acres ? `${f.area_acres} acres` : '—'}</p>
              </div>
              <div>
                <p className="text-soil-400 text-xs">{t('soilType')}</p>
                <p className="font-semibold">{f.soil_type || '—'}</p>
              </div>
            </div>
            {f.lat && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-soil-400 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-canopy-500" />
                  {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                </p>
                {/* Compact inline map */}
                <iframe
                  title={`Map for ${f.name}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${f.lng - 0.005},${f.lat - 0.005},${f.lng + 0.005},${f.lat + 0.005}&layer=mapnik&marker=${f.lat},${f.lng}`}
                  className="w-full h-28 rounded-xl border border-soil-200"
                  style={{ border: 0 }}
                  loading="lazy"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <FieldForm
          farmerId={farmerId}
          onClose={() => setShowForm(false)}
          onSaved={(f) => {
            setFields((prev) => [f, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
