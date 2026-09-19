// Demo-mode data. Shaped to match supabase/schema.sql exactly, so switching
// from mock data to real Supabase queries in src/lib/api.js never requires
// changing a single component prop.

export const mockFarmer = {
  id: 'farmer-demo-1',
  full_name: 'Ramesh Chaudhary',
  preferred_language: 'hi',
  village: 'Bassi',
  district: 'Jaipur',
  state: 'Rajasthan',
  phone: '+91 98290 00000',
};

export const mockFields = [
  {
    id: 'field-1',
    name: 'North plot',
    crop: 'Tomato',
    variety: 'Pusa Ruby',
    sowing_date: '2026-07-12',
    crop_stage: 'Flowering',
    area_acres: 1.5,
    soil_type: 'Loamy',
    lat: 26.9856,
    lng: 75.9004,
  },
  {
    id: 'field-2',
    name: 'Well-side plot',
    crop: 'Cotton',
    variety: 'Bt-II',
    sowing_date: '2026-06-02',
    crop_stage: 'Boll development',
    area_acres: 2.2,
    soil_type: 'Sandy loam',
    lat: 26.9901,
    lng: 75.9120,
  },
];

export const mockCases = [
  {
    id: 'case-104',
    field_id: 'field-1',
    field_name: 'North plot',
    crop: 'Tomato',
    status: 'advisory',
    risk_level: 'high',
    prediction: 'Early blight (Alternaria solani)',
    confidence: 0.86,
    created_at: '2026-09-14T06:20:00Z',
    thumbnail: '🍅',
  },
  {
    id: 'case-101',
    field_id: 'field-2',
    field_name: 'Well-side plot',
    crop: 'Cotton',
    status: 'follow_up',
    risk_level: 'moderate',
    prediction: 'Pink bollworm activity',
    confidence: 0.71,
    created_at: '2026-09-09T10:05:00Z',
    thumbnail: '🌱',
  },
  {
    id: 'case-098',
    field_id: 'field-1',
    field_name: 'North plot',
    crop: 'Tomato',
    status: 'resolved',
    risk_level: 'low',
    prediction: 'Nutrient deficiency (nitrogen)',
    confidence: 0.64,
    created_at: '2026-08-28T09:40:00Z',
    thumbnail: '🍅',
  },
];

export const mockCaseDetail = {
  'case-104': {
    evidence: [
      'Concentric dark rings on lower leaves, consistent with early blight lesions',
      'Yellowing spreading upward from older foliage',
      'Warm, humid conditions over the last 5 days favor fungal spread',
    ],
    weather_context: { temp_c: 31, humidity_pct: 78, rainfall_mm_7d: 14 },
    next_action:
      'Remove and destroy affected lower leaves. Improve airflow between plants. Apply a protectant fungicide if spread continues past 3 days — confirm the product with your local extension worker before use.',
    lab_referral_recommended: false,
    validation: {
      status: 'pending',
      reviewer: null,
      notes: null,
    },
    timeline: [
      { at: '2026-09-14T06:20:00Z', label: 'Reported', by: 'You' },
      { at: '2026-09-14T06:21:00Z', label: 'AI assessed', by: 'KrishiVed AI' },
      { at: '2026-09-14T09:00:00Z', label: 'Advisory issued', by: 'KrishiVed AI' },
    ],
  },
};

export const mockAlerts = [
  {
    id: 'alert-1',
    field_name: 'North plot',
    severity: 'high',
    title: 'Rising early blight risk',
    detail: 'Humidity above 75% for 3 days straight — conditions favor fungal spread on tomato.',
    created_at: '2026-09-16T05:00:00Z',
  },
  {
    id: 'alert-2',
    field_name: 'Well-side plot',
    severity: 'moderate',
    title: 'Pink bollworm trap counts rising nearby',
    detail: '3 confirmed reports within 4 km over the last week.',
    created_at: '2026-09-15T05:00:00Z',
  },
];

export const mockWeather = {
  temp_c: 31,
  humidity_pct: 78,
  rainfall_mm_7d: 14,
  condition: 'Partly cloudy',
  forecast_note: 'Humid conditions expected to continue for 2 more days.',
};
