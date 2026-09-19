// Single place every screen goes through to read/write data. Every function
// checks `isDemoMode` and falls back to mock data, so the UI is fully
// browsable before Supabase or the ML service exist, and nothing in the
// components needs to change once they're wired up — only this file does.

import { supabase, isDemoMode } from './supabaseClient';
import {
  mockFarmer,
  mockFields,
  mockCases,
  mockCaseDetail,
  mockAlerts,
  mockWeather,
} from '../mock/data';

const ML_API_URL = import.meta.env.VITE_ML_API_URL;
const ML_API_KEY = import.meta.env.VITE_ML_API_KEY;
const WEATHER_API_URL = import.meta.env.VITE_WEATHER_API_URL;
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Helper to sanitize UUID string inputs (prevents Postgres 22P02 invalid input syntax error)
function sanitizeUuid(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

// Helper to sanitize numeric inputs
function sanitizeNumber(val) {
  if (val === '' || val == null) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/* ------------------------------------------------------------------ */
/*  Farmer profile                                                     */
/* ------------------------------------------------------------------ */

export async function getFarmerProfile(userId) {
  if (isDemoMode) {
    await delay(150);
    return mockFarmer;
  }
  if (!userId) return null;

  const { data, error } = await supabase
    .from('farmers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  // Auto-create initial farmer profile if it doesn't exist
  if (!data) {
    const { data: newFarmer, error: insertError } = await supabase
      .from('farmers')
      .insert({ id: userId, user_id: userId })
      .select()
      .maybeSingle();
    if (!insertError && newFarmer) return newFarmer;
  }

  return data;
}

export async function upsertFarmerProfile(userId, profile) {
  if (isDemoMode) {
    await delay(150);
    return { ...mockFarmer, ...profile };
  }
  const cleanProfile = {
    user_id: userId,
    full_name: profile.full_name || null,
    phone: profile.phone || null,
    preferred_language: profile.preferred_language || 'en',
    village: profile.village || null,
    district: profile.district || null,
    state: profile.state || null,
  };

  const { data, error } = await supabase
    .from('farmers')
    .upsert(cleanProfile, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Fields                                                              */
/* ------------------------------------------------------------------ */

export async function listFields(farmerId) {
  if (isDemoMode) {
    await delay(150);
    return mockFields;
  }
  if (!farmerId) return [];

  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createField(farmerId, field) {
  if (isDemoMode) {
    await delay(150);
    return { id: `field-${Date.now()}`, ...field };
  }

  const cleanFarmerId = sanitizeUuid(farmerId);
  if (!cleanFarmerId) {
    throw new Error('Farmer ID is required to create a field.');
  }

  const cleanField = {
    farmer_id: cleanFarmerId,
    name: field.name?.trim() || 'Untitled Field',
    crop: field.crop?.trim() || '',
    variety: field.variety?.trim() || null,
    sowing_date: field.sowing_date && field.sowing_date.trim() ? field.sowing_date.trim() : null,
    crop_stage: field.crop_stage?.trim() || null,
    area_acres: sanitizeNumber(field.area_acres),
    soil_type: field.soil_type?.trim() || null,
    lat: sanitizeNumber(field.lat),
    lng: sanitizeNumber(field.lng),
  };

  const { data, error } = await supabase
    .from('fields')
    .insert(cleanField)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Cases (health incidents)                                           */
/* ------------------------------------------------------------------ */

export async function listCases(farmerId) {
  if (isDemoMode) {
    await delay(150);
    return mockCases;
  }
  let query = supabase
    .from('cases')
    .select('*, fields(name, crop)')
    .order('created_at', { ascending: false });

  const cleanFarmerId = sanitizeUuid(farmerId);
  if (cleanFarmerId) {
    query = query.eq('farmer_id', cleanFarmerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getCaseDetail(caseId) {
  if (isDemoMode) {
    await delay(150);
    return mockCaseDetail[caseId] ?? mockCaseDetail['case-104'];
  }
  const cleanCaseId = sanitizeUuid(caseId);
  if (!cleanCaseId) throw new Error('Valid case ID required.');

  const { data, error } = await supabase
    .from('cases')
    .select(
      '*, fields(name, crop), observations(*), risk_assessments(*), validations(*), advisories(*), follow_ups(*)'
    )
    .eq('id', cleanCaseId)
    .single();

  if (error) throw error;
  return data;
}

export async function submitFollowUp(caseId, followUp) {
  if (isDemoMode) {
    await delay(200);
    return { id: `followup-${Date.now()}`, case_id: caseId, ...followUp };
  }
  const cleanCaseId = sanitizeUuid(caseId);
  if (!cleanCaseId) throw new Error('Valid case ID required.');

  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      case_id: cleanCaseId,
      status_update: followUp.status_update || null,
      note: followUp.note?.trim() || null,
      image_url: followUp.image_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Alerts                                                              */
/* ------------------------------------------------------------------ */

export async function listAlerts(farmerId) {
  if (isDemoMode) {
    await delay(150);
    return mockAlerts;
  }
  const cleanFarmerId = sanitizeUuid(farmerId);
  if (!cleanFarmerId) return [];

  const { data, error } = await supabase
    .from('alerts')
    .select('*, fields(name)')
    .eq('farmer_id', cleanFarmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ------------------------------------------------------------------ */
/*  Weather                                                             */
/* ------------------------------------------------------------------ */

export async function getWeather(lat, lng) {
  if (isDemoMode || !WEATHER_API_URL || !WEATHER_API_KEY) {
    await delay(150);
    return mockWeather;
  }
  const url = `${WEATHER_API_URL}/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  const raw = await res.json();
  return {
    temp_c: raw.main?.temp,
    humidity_pct: raw.main?.humidity,
    rainfall_mm_7d: raw.rain?.['1h'] ? raw.rain['1h'] * 24 * 7 : 0,
    condition: raw.weather?.[0]?.description ?? 'Unknown',
    forecast_note: '',
  };
}

/* ------------------------------------------------------------------ */
/*  ML model — disease / pest detection (ResNet50-based service)       */
/* ------------------------------------------------------------------ */

export async function analyzeImage({ file, crop, cropStage, fieldId, lat, lng }) {
  if (isDemoMode || !ML_API_URL || ML_API_URL.includes('your-ml-service')) {
    await delay(1600);
    return {
      prediction: 'Early blight (Alternaria solani)',
      confidence: 0.86,
      class_id: 'tomato_early_blight',
      evidence: [
        'Concentric dark rings detected on leaf surface',
        'Lesion pattern consistent with early blight',
        'Symptom distribution starts from lower/older leaves',
      ],
      gradcam_image_base64: null,
      requires_expert_review: false,
      next_action:
        'Remove affected lower leaves and improve airflow. Monitor daily — request expert review if spread continues past 3 days.',
      demo: true,
    };
  }

  const form = new FormData();
  form.append('image', file);
  form.append('crop', crop ?? '');
  if (cropStage) form.append('crop_stage', cropStage);
  if (fieldId) form.append('field_id', fieldId);
  if (lat != null) form.append('lat', String(lat));
  if (lng != null) form.append('lng', String(lng));

  const res = await fetch(ML_API_URL, {
    method: 'POST',
    headers: ML_API_KEY ? { Authorization: `Bearer ${ML_API_KEY}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Model service returned ${res.status}`);
  }
  return res.json();
}

/**
 * Persists an observation + AI assessment as a new case.
 */
export async function createCaseFromAnalysis({ farmerId, fieldId, imageUrl, analysis }) {
  if (isDemoMode) {
    await delay(200);
    return {
      id: `case-${Date.now()}`,
      field_id: fieldId || null,
      status: 'ai_assessed',
      risk_level: analysis?.confidence > 0.8 ? 'high' : 'moderate',
      prediction: analysis?.prediction,
      confidence: analysis?.confidence,
      created_at: new Date().toISOString(),
    };
  }

  // Sanitize UUID fields to avoid PostgreSQL 22P02 invalid input syntax error
  let cleanFieldId = sanitizeUuid(fieldId);
  const cleanFarmerId = sanitizeUuid(farmerId);

  if (!cleanFarmerId) {
    throw new Error('User profile ID is missing. Please sign in or refresh your profile.');
  }

  // If no fieldId was provided or selected, resolve an existing field or create a default field
  // to support both nullable and legacy NOT NULL database schemas.
  if (!cleanFieldId) {
    try {
      const { data: existingFields } = await supabase
        .from('fields')
        .select('id')
        .eq('farmer_id', cleanFarmerId)
        .limit(1);

      if (existingFields && existingFields.length > 0) {
        cleanFieldId = existingFields[0].id;
      } else {
        const { data: defaultField } = await supabase
          .from('fields')
          .insert({
            farmer_id: cleanFarmerId,
            name: 'Primary Field',
            crop: (analysis?.prediction ? analysis.prediction.split(' ')[0] : 'Crop') || 'General',
          })
          .select()
          .maybeSingle();

        if (defaultField) {
          cleanFieldId = defaultField.id;
        }
      }
    } catch {
      // Ignore fallback field creation error and proceed
    }
  }

  const { data: obs, error: obsError } = await supabase
    .from('observations')
    .insert({
      field_id: cleanFieldId,
      farmer_id: cleanFarmerId,
      image_url: imageUrl || null,
      observation_type: 'image',
    })
    .select()
    .single();

  if (obsError) throw obsError;

  const confidenceNum = sanitizeNumber(analysis?.confidence);
  const riskLevel =
    confidenceNum && confidenceNum > 0.8 ? 'high' : confidenceNum && confidenceNum > 0.5 ? 'moderate' : 'low';

  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .insert({
      farmer_id: cleanFarmerId,
      field_id: cleanFieldId,
      observation_id: obs?.id || null,
      status: 'ai_assessed',
      risk_level: riskLevel,
      prediction: analysis?.prediction || 'Undetected condition',
      confidence: confidenceNum,
      class_id: analysis?.class_id || null,
      evidence: Array.isArray(analysis?.evidence) ? analysis.evidence : (analysis?.evidence ? [analysis.evidence] : []),
      requires_expert_review: Boolean(analysis?.requires_expert_review),
      next_action: analysis?.next_action || null,
    })
    .select()
    .single();

  if (caseError) throw caseError;
  return caseRow;
}

export async function uploadFieldImage(file, farmerId) {
  if (isDemoMode) {
    await delay(200);
    return URL.createObjectURL(file);
  }
  const cleanFolder = sanitizeUuid(farmerId) || 'anonymous';
  const ext = file.name ? file.name.split('.').pop() : 'jpg';
  const path = `${cleanFolder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const { error } = await supabase.storage.from('field-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  const { data } = supabase.storage.from('field-images').getPublicUrl(path);
  return data.publicUrl;
}
