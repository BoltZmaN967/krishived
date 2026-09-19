# KrishiVed — Farmer web app

Farmer-facing interface for the Crop Health Early Warning & Decision
Support System (PRD SIH26131). Built with **React + Vite + Tailwind CSS**,
wired for **Supabase** (auth, database, storage) and a **ResNet50-based**
disease/pest detection service.

Covers the MVP scope from the PRD: farmer profile, field registration,
image-based detection with confidence + evidence + next action, weather
context, case history with the full lifecycle, expert-validation status,
follow-up monitoring, alerts, and a language switcher.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your keys — see below
npm run dev
```

The app runs with **zero configuration** in demo mode: with no `.env`
values it uses realistic mock data everywhere (`src/mock/data.js`), so you
can review the whole UI before any backend exists. Every screen behaves
identically once real services are connected — only `src/lib/api.js`
switches between mock and live calls.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` — it creates every table
   in the conceptual data model from PRD §11 (farmers, fields,
   observations, cases, risk assessments, validations, advisories,
   follow-ups, alerts), a public `field-images` storage bucket, and
   row-level security so a farmer only ever sees their own data.
3. Enable phone auth (Authentication → Providers → Phone) if you want the
   OTP login screen (`src/pages/Login.jsx`) to work, or swap it for
   email/password / magic link — the `AuthContext` only needs
   `signInWithOtp` / `verifyOtp` renamed and re-pointed at the
   corresponding Supabase call.
4. Copy your Project URL and anon key into `.env` as `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_ANON_KEY`.

Once both are set, `isDemoMode` in `src/lib/supabaseClient.js` flips to
`false` and every page starts reading/writing real data automatically.

## Connecting the PyTorch CNN & Grad-CAM Model (`best_cnn_model.pth`)

KrishiVed includes a dedicated PyTorch inference service with Grad-CAM visual attention mapping:

```bash
# Start the ML Inference Server (port 8008)
python ml_service/server.py
```

The service loads `models/best_cnn_model.pth` (Custom 4-Class CNN) and computes Grad-CAM heatmaps on the last convolutional layer (`features[9]`), returning class predictions, confidence levels, clinical markers, and base64-encoded visual overlays.

| Field        | Type   | Required | Notes                          |
|--------------|--------|----------|---------------------------------|
| `image`      | file   | yes      | JPEG/PNG                        |
| `crop`       | string | yes      | e.g. `"Tomato"`                 |
| `crop_stage` | string | no       | e.g. `"Flowering"`               |
| `field_id`   | string | no       | for logging / geospatial join   |
| `lat`, `lng` | number | no       | for regional hotspot clustering |

Response — `application/json`

```json
{
  "prediction": "Early blight (Alternaria solani)",
  "confidence": 0.86,
  "class_id": "tomato_early_blight",
  "evidence": [
    "Concentric dark rings detected on leaf surface",
    "Lesion pattern consistent with early blight"
  ],
  "gradcam_image_base64": null,
  "requires_expert_review": false,
  "next_action": "Remove affected lower leaves and improve airflow…"
}
```

This mirrors the PRD's AI requirement (§12): every assessment must
surface **prediction, confidence, evidence, and next action** — the UI in
`src/pages/Detect.jsx` renders exactly these four fields and nothing the
model can't actually support. If your service can't produce `evidence` or
`next_action` yet, return empty arrays/strings; the UI degrades cleanly.

Low-confidence results (suggested threshold: below ~0.6, tune with domain
experts per PRD §12/§20) should set `"requires_expert_review": true` —
the case then surfaces that flag through `CaseDetail.jsx`.

Set `VITE_ML_API_KEY` if your endpoint needs a bearer token; leave it
blank for an open/internal endpoint.

## Connecting weather

`getWeather()` in `src/lib/api.js` defaults to an OpenWeather-shaped call.
Point `VITE_WEATHER_API_URL` / `VITE_WEATHER_API_KEY` at any provider and
adjust the small mapping block at the bottom of that function to match
its response shape — nothing else in the app needs to change.

## Project structure

```
src/
  lib/
    supabaseClient.js   Supabase client + demo-mode flag
    api.js              Every data call — Supabase, ML model, weather
  context/
    AuthContext.jsx      Session + farmer profile
    LanguageContext.jsx  Minimal i18n (FR-14) — English/Hindi included
  components/
    AppShell.jsx        Sidebar (desktop) / bottom nav (mobile)
    RiskBadge.jsx        Low/Moderate/High/Critical (PRD §13)
    StatusPill.jsx       Case lifecycle (PRD FR-17)
    StatCard.jsx, EmptyState.jsx
  pages/
    Login.jsx            Phone OTP
    Dashboard.jsx         Home — risk summary, quick detect, alerts, open cases
    Fields.jsx            FR-01 / FR-02
    Detect.jsx            FR-03 — the ResNet50 integration point
    Cases.jsx / CaseDetail.jsx   FR-17, FR-09, FR-10, FR-13
    Alerts.jsx            FR-07
    Profile.jsx           FR-01, language preference
supabase/
  schema.sql             Full table set + RLS
```

## Design notes

- Farmer-facing screens follow the PRD's accessibility requirement:
  short sentences, plain language, large tap targets, minimal steps to
  the core action (Home → Check a plant is one tap).
- Bottom tab bar on mobile, sidebar on desktop/tablet — most farmers will
  use this on a phone, so mobile is the primary layout, not an
  afterthought.
- Palette and type are defined as design tokens in `tailwind.config.js`
  (`canopy` = greens, `turmeric` = amber for moderate risk/alerts,
  `alert.*` = the four PRD risk levels) so a rebrand or theming pass
  touches one file.
- Officials' and extension workers' dashboards (FR-15, FR-16) and the
  geospatial hotspot map (FR-08) are **Should**-priority per the PRD and
  are intentionally out of scope for this farmer-facing build — the
  schema and RLS already leave room for those roles (see the note at the
  bottom of `supabase/schema.sql`).

## Build for production

```bash
npm run build   # outputs to dist/
npm run preview # sanity-check the production build locally
```
