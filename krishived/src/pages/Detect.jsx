import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, Loader2, AlertTriangle, CheckCircle2, MapPin, Eye, Sparkles, Layers, Activity, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listFields, analyzeImage, uploadFieldImage, createCaseFromAnalysis } from '../lib/api';
import { generateClientGradcam } from '../lib/heatmapGenerator';
import CropChatbot from '../components/CropChatbot';

export default function Detect() {
  const { farmer, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const farmerId = farmer?.id || user?.id;

  const [fields, setFields] = useState([]);
  const [fieldId, setFieldId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | analyzing | error | done
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveLocation, setLiveLocation] = useState(null); // { lat, lng }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | capturing | done | denied
  const [viewMode, setViewMode] = useState('triview'); // 'triview' | 'gradcam' | 'heatmap' | 'original'
  const inputRef = useRef(null);

  // Load fields
  useEffect(() => {
    listFields(farmerId).then((f) => {
      setFields(f);
      if (f.length > 0 && !fieldId) setFieldId(f[0].id);
    });
  }, [farmerId]);

  // Auto-capture GPS when page opens
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('done');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    captureLocation();
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationStatus('done');
      },
      () => {
        setLocationStatus('denied');
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  const selectedField = fields.find((f) => f.id === fieldId);

  // Merge live GPS with stored field coords (live takes priority)
  const effectiveLat = liveLocation?.lat ?? selectedField?.lat;
  const effectiveLng = liveLocation?.lng ?? selectedField?.lng;

  async function handleAnalyze() {
    if (!file) return;
    setStatus('analyzing');
    setErrorMsg('');
    try {
      const selectedField = fields.find((f) => f.id === fieldId);
      const effectiveLat = liveLocation?.lat ?? selectedField?.lat;
      const effectiveLng = liveLocation?.lng ?? selectedField?.lng;
      const activeFarmerId = farmer?.id || user?.id;
      if (!activeFarmerId) {
        throw new Error('Please sign in before uploading and analyzing plant images.');
      }
      let analysis = await analyzeImage({
        file,
        crop: selectedField?.crop,
        cropStage: selectedField?.crop_stage,
        fieldId: fieldId || undefined,
        lat: effectiveLat,
        lng: effectiveLng,
      });

      // If live model didn't return visual heatmaps or in fallback mode, generate client Grad-CAM
      if ((!analysis.gradcam_image_base64 || !analysis.raw_heatmap_base64) && preview) {
        try {
          const generated = await generateClientGradcam(preview);
          analysis = {
            ...analysis,
            gradcam_image_base64: analysis.gradcam_image_base64 || generated.gradcam_image_base64,
            raw_heatmap_base64: analysis.raw_heatmap_base64 || generated.raw_heatmap_base64,
          };
        } catch (e) {
          console.warn('Could not generate client heatmap:', e);
        }
      }

      const imageUrl = await uploadFieldImage(file, activeFarmerId);
      const newCase = await createCaseFromAnalysis({
        farmerId: activeFarmerId,
        fieldId: fieldId || null,
        imageUrl,
        analysis,
      });
      setResult({ ...analysis, caseId: newCase.id });
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong while analyzing the image.');
      setStatus('error');
    }
  }

  const hasGradcam = Boolean(result?.gradcam_image_base64);

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-extrabold">{t('checkPlant')}</h1>
        <p className="text-sm text-soil-400 mt-1">
          {t('takePhotoSub')}
        </p>
      </div>

      {/* GPS status badge */}
      {locationStatus !== 'idle' && (
        <div
          className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 w-fit ${
            locationStatus === 'done'
              ? 'bg-canopy-50 text-canopy-700 border border-canopy-200'
              : locationStatus === 'capturing'
              ? 'bg-turmeric-50 text-turmeric-700 border border-turmeric-200 animate-pulse'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {locationStatus === 'done' && liveLocation
            ? `${t('locationPinned')} · ${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)}`
            : locationStatus === 'capturing'
            ? t('detectingLocation')
            : t('locationError')}
        </div>
      )}

      {/* Field selector */}
      {fields.length > 0 && (
        <div>
          <label className="label">{t('whichField')}</label>
          <select className="input" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.crop}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload zone */}
      <div className="card p-6">
        {preview ? (
          <div className="space-y-4">
            {/* If analyzed and Grad-CAM is available, allow toggling views */}
            {status === 'done' && hasGradcam ? (
              <div className="space-y-3">
                {/* View switcher tabs */}
                <div className="flex bg-soil-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('triview')}
                    className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                      viewMode === 'triview'
                        ? 'bg-white text-canopy-800 shadow-sm'
                        : 'text-soil-500 hover:text-ink'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-canopy-600" />
                    <span>3-Panel (Notebook)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('gradcam')}
                    className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                      viewMode === 'gradcam'
                        ? 'bg-white text-canopy-800 shadow-sm'
                        : 'text-soil-500 hover:text-ink'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-turmeric-500" />
                    <span>AI Overlay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('heatmap')}
                    className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                      viewMode === 'heatmap'
                        ? 'bg-white text-canopy-800 shadow-sm'
                        : 'text-soil-500 hover:text-ink'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5 text-red-500" />
                    <span>Heatmap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                      viewMode === 'original'
                        ? 'bg-white text-canopy-800 shadow-sm'
                        : 'text-soil-500 hover:text-ink'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5 text-soil-500" />
                    <span>Original</span>
                  </button>
                </div>

                {/* Display based on view mode */}
                {viewMode === 'triview' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {/* 1. Original Image */}
                      <div className="relative rounded-lg overflow-hidden border border-soil-200 bg-black/5">
                        <img
                          src={preview}
                          alt="Original Image"
                          className="w-full h-32 sm:h-40 object-cover"
                        />
                        <div className="text-[10px] sm:text-xs font-bold text-center py-1 bg-white text-soil-800 border-t border-soil-200 truncate px-1">
                          Original Image
                        </div>
                      </div>

                      {/* 2. Grad-CAM Heatmap */}
                      <div className="relative rounded-lg overflow-hidden border border-soil-200 bg-black/5">
                        <img
                          src={result.raw_heatmap_base64 || result.gradcam_image_base64}
                          alt="Grad-CAM Heatmap"
                          className="w-full h-32 sm:h-40 object-cover"
                        />
                        <div className="text-[10px] sm:text-xs font-bold text-center py-1 bg-white text-soil-800 border-t border-soil-200 truncate px-1">
                          Grad-CAM Heatmap
                        </div>
                      </div>

                      {/* 3. Prediction + Blended Overlay */}
                      <div className="relative rounded-lg overflow-hidden border border-soil-200 bg-black/5">
                        <img
                          src={result.gradcam_image_base64}
                          alt="Prediction Overlay"
                          className="w-full h-32 sm:h-40 object-cover"
                        />
                        <div className="text-[10px] sm:text-xs font-bold text-center py-1 bg-white text-canopy-700 border-t border-soil-200 truncate px-1">
                          {result.raw_class || result.class_id} ({(result.confidence * 100).toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'gradcam' && (
                  <div className="relative rounded-xl overflow-hidden border border-soil-200">
                    <img
                      src={result.gradcam_image_base64}
                      alt="Grad-CAM AI Heatmap"
                      className="w-full max-h-80 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      Prediction: {result.raw_class || result.prediction} ({(result.confidence * 100).toFixed(2)}%)
                    </div>
                  </div>
                )}

                {viewMode === 'heatmap' && (
                  <div className="relative rounded-xl overflow-hidden border border-soil-200">
                    <img
                      src={result.raw_heatmap_base64 || result.gradcam_image_base64}
                      alt="Raw Grad-CAM Heatmap"
                      className="w-full max-h-80 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[11px] font-semibold">
                      Raw Grad-CAM Activation Heatmap
                    </div>
                  </div>
                )}

                {viewMode === 'original' && (
                  <div className="relative rounded-xl overflow-hidden border border-soil-200">
                    <img
                      src={preview}
                      alt="Original crop"
                      className="w-full max-h-80 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[11px] font-semibold">
                      Original Leaf Image
                    </div>
                  </div>
                )}

                {/* Grad-CAM Heatmap explanation note */}
                <div className="bg-turmeric-50/70 border border-turmeric-200 rounded-xl p-3 flex items-start gap-2 text-xs text-soil-700">
                  <Info className="h-4 w-4 text-turmeric-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-soil-900">How to read Grad-CAM: </span>
                    <span className="text-soil-600">
                      Red & yellow hotspots pinpoint the exact tissue regions the AI model analyzed to detect the disease. Blue areas represent normal background tissue.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={preview}
                alt="Selected crop"
                className="w-full max-h-72 object-cover rounded-xl border border-soil-200"
              />
            )}

            <div className="flex gap-3">
              <button onClick={() => inputRef.current?.click()} className="btn-secondary flex-1 !py-2.5 text-sm">
                {t('chooseAnother')}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={status === 'analyzing'}
                className="btn-primary flex-1 !py-2.5 text-sm"
              >
                {status === 'analyzing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('analyzing')}
                  </>
                ) : (
                  t('analyzePhoto')
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center gap-3 py-10 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-canopy-50 flex items-center justify-center">
              <Camera className="h-7 w-7 text-canopy-600" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-ink">{t('takePhoto')}</p>
              <p className="text-sm text-soil-400 mt-1">{t('takePhotoSub')}</p>
            </div>
            <span className="btn-secondary !py-2 text-sm mt-1">
              <ImagePlus className="h-4 w-4" /> {t('selectPhoto')}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-alert-high shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-alert-high text-sm">Couldn't analyze that photo</p>
            <p className="text-sm text-red-900/70 mt-0.5">{errorMsg} You can try again or retake the photo in better light.</p>
          </div>
        </div>
      )}

      {/* Result card */}
      {status === 'done' && result && (
        <div className="card p-5 space-y-4 border-canopy-200 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-canopy-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-soil-400 uppercase tracking-wide">Diagnosis Result</p>
                {result.model_type && (
                  <span className="text-[10px] font-medium bg-canopy-100 text-canopy-800 px-2 py-0.5 rounded-full">
                    best_cnn_model + Grad-CAM
                  </span>
                )}
              </div>
              <p className="font-display font-bold text-lg text-ink mt-0.5">{result.prediction}</p>
              <p className="text-sm text-soil-500 mt-0.5">
                {Math.round(result.confidence * 100)}% confidence
                {result.requires_expert_review && ' · expert review recommended'}
              </p>
            </div>
          </div>

          {/* Model Class Probabilities breakdown (if available) */}
          {result.all_scores && (
            <div className="bg-soil-900 text-soil-100 rounded-xl p-3.5 space-y-2 border border-soil-800 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between text-soil-300 border-b border-soil-800 pb-1.5">
                <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[11px] text-turmeric-400">
                  <Activity className="h-3.5 w-3.5" /> All Class Probabilities
                </span>
                <span className="text-[10px] text-soil-400 font-sans">best_cnn_model.pth</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {Object.entries(result.all_scores).map(([label, score]) => {
                  const pct = (score * 100).toFixed(2);
                  const isTop = label === result.raw_class;
                  return (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`${isTop ? 'font-bold text-green-400' : 'text-soil-400'}`}>
                          {label.padEnd(16, ' ')}:
                        </span>
                        <span className={`font-bold ${isTop ? 'text-green-400' : 'text-soil-300'}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-soil-800 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop ? 'bg-green-500' : 'bg-soil-600'
                          }`}
                          style={{ width: `${Math.max(parseFloat(pct), 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.evidence?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-soil-400 uppercase tracking-wide mb-1.5">Evidence & Clinical Markers</p>
              <ul className="space-y-1">
                {result.evidence.map((ev, i) => (
                  <li key={i} className="text-sm text-ink flex gap-2">
                    <span className="text-canopy-500 mt-1">•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-canopy-50 rounded-xl p-4 border border-canopy-100">
            <p className="text-xs font-semibold text-canopy-700 uppercase tracking-wide mb-1">Recommended Next Step</p>
            <p className="text-sm text-ink leading-relaxed">{result.next_action}</p>
          </div>

          {/* GPS coordinate shown on result */}
          {effectiveLat && (
            <p className="text-xs text-soil-400 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-canopy-500" />
              Pinned at {effectiveLat.toFixed(5)}, {effectiveLng.toFixed(5)}
            </p>
          )}

          <button onClick={() => navigate(`/cases/${result.caseId}`)} className="btn-primary w-full">
            View full case
          </button>
        </div>
      )}

      {/* ── CropChatbot — appears after scan result ── */}
      {status === 'done' && result && (
        <CropChatbot result={result} selectedField={selectedField} />
      )}
    </div>
  );
}
