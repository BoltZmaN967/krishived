import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Clock, FlaskConical } from 'lucide-react';
import { listCases, getCaseDetail, submitFollowUp } from '../lib/api';
import RiskBadge from '../components/RiskBadge';
import StatusPill from '../components/StatusPill';

const FOLLOW_UP_OPTIONS = ['Improving', 'Stable', 'Worsening'];

export default function CaseDetail() {
  const { id } = useParams();
  const [caseSummary, setCaseSummary] = useState(null);
  const [detail, setDetail] = useState(null);
  const [followUpStatus, setFollowUpStatus] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    listCases().then((all) => setCaseSummary(all.find((c) => c.id === id)));
    getCaseDetail(id).then(setDetail);
  }, [id]);

  async function handleFollowUp(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFollowUp(id, { status_update: followUpStatus, note: followUpNote });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!caseSummary || !detail) {
    return <p className="text-sm text-soil-400">Loading case…</p>;
  }

  return (
    <div className="space-y-5 max-w-xl">
      <Link to="/cases" className="inline-flex items-center gap-1.5 text-sm font-semibold text-canopy-700">
        <ArrowLeft className="h-4 w-4" /> Case history
      </Link>

      <div className="flex items-center gap-2 flex-wrap">
        <RiskBadge level={caseSummary.risk_level} />
        <StatusPill status={caseSummary.status} />
      </div>

      <div>
        <h1 className="text-xl font-extrabold">{caseSummary.prediction}</h1>
        <p className="text-sm text-soil-400">
          {caseSummary.field_name} · {caseSummary.crop} · {Math.round(caseSummary.confidence * 100)}% confidence
        </p>
      </div>

      {/* Evidence */}
      {detail.evidence?.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-400 uppercase tracking-wide mb-2">Evidence</p>
          <ul className="space-y-1.5">
            {detail.evidence.map((ev, i) => (
              <li key={i} className="text-sm text-ink flex gap-2">
                <span className="text-canopy-500 mt-1">•</span>
                <span>{ev}</span>
              </li>
            ))}
          </ul>
          {detail.weather_context && (
            <p className="text-xs text-soil-400 mt-3 pt-3 border-t border-soil-200">
              Conditions at the time: {detail.weather_context.temp_c}°C, {detail.weather_context.humidity_pct}% humidity,{' '}
              {detail.weather_context.rainfall_mm_7d}mm rain in the last 7 days.
            </p>
          )}
        </div>
      )}

      {/* Advisory */}
      <div className="card p-5 bg-canopy-50 border-canopy-100">
        <p className="text-xs font-semibold text-canopy-700 uppercase tracking-wide mb-1.5">Recommended action</p>
        <p className="text-sm text-ink leading-relaxed">{detail.next_action}</p>
        {detail.lab_referral_recommended && (
          <p className="text-sm font-semibold text-alert-high mt-3 flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4" /> Lab confirmation recommended for this case
          </p>
        )}
      </div>

      {/* Expert validation */}
      <div className="card p-5 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-canopy-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-ink">Expert validation</p>
          <p className="text-sm text-soil-400 mt-0.5">
            {detail.validation?.status === 'pending'
              ? 'Waiting for an extension worker or expert to review this case.'
              : detail.validation?.notes || 'No validation notes yet.'}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {detail.timeline?.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-soil-400 uppercase tracking-wide mb-3">Timeline</p>
          <ul className="space-y-3">
            {detail.timeline.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-canopy-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-canopy-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{step.label}</p>
                  <p className="text-xs text-soil-400">
                    {step.by} · {new Date(step.at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up */}
      <div className="card p-5">
        <p className="font-semibold text-sm text-ink mb-3">How is it looking now?</p>
        {submitted ? (
          <p className="text-sm text-canopy-700 font-medium">Thanks — your update has been recorded.</p>
        ) : (
          <form onSubmit={handleFollowUp} className="space-y-3">
            <div className="flex gap-2">
              {FOLLOW_UP_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setFollowUpStatus(opt)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    followUpStatus === opt
                      ? 'bg-canopy-600 border-canopy-600 text-white'
                      : 'border-soil-300 text-canopy-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-[80px]"
              placeholder="Anything else worth noting? (optional)"
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
            />
            <button type="submit" disabled={!followUpStatus || submitting} className="btn-primary w-full">
              {submitting ? 'Submitting…' : 'Submit update'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
