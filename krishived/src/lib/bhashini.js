/**
 * bhashini.js — KrishiVed integration with Bhashini (ULCA) & Multi-Language Voice APIs
 *
 * Covers three capabilities:
 *   1. ASR  — Automatic Speech Recognition (voice → text)
 *   2. TTS  — Text-To-Speech (text → audio playback)
 *   3. NMT  — Neural Machine Translation (text → translated text)
 *
 * Designed with bulletproof graceful fallback:
 * If Bhashini API key is absent, returns an error, or is blocked by CORS/network,
 * it automatically switches to browser Web Speech API (ASR / TTS) and multi-language translation.
 */

const BHASHINI_USER_ID = import.meta.env.VITE_BHASHINI_USER_ID || '';
const BHASHINI_API_KEY = import.meta.env.VITE_BHASHINI_API_KEY || '';
const INFERENCE_URL    = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

/** Map language codes to Bhashini / Browser language tags */
const LANG_MAP = {
  en: 'en',
  hi: 'hi',
  mr: 'mr',
  pa: 'pa',
  te: 'te',
  ta: 'ta',
  kn: 'kn',
  gu: 'gu',
  bn: 'bn',
};

const BROWSER_LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
};

// Known reliable Bhashini / AI4Bharat default model service IDs
const DEFAULT_SERVICE_IDS = {
  translation: 'ai4bharat/indictrans-v2-all-gpu--t4',
  asr: 'ai4bharat/conformer-hi-gpu--t4',
  tts: 'ai4bharat/indic-tts-coqui-all-gpu--t4',
};

let bhashiniAuthFailed = false;

function bhashiniHeaders() {
  return {
    'Content-Type': 'application/json',
    userID: BHASHINI_USER_ID,
    ulcaApiKey: BHASHINI_API_KEY,
    Authorization: BHASHINI_API_KEY,
  };
}

/* ------------------------------------------------------------------ */
/*  1. ASR — Automatic Speech Recognition                             */
/* ------------------------------------------------------------------ */

/**
 * Convert speech to text.
 * Automatically tries Bhashini ASR if an audioBlob is provided,
 * and seamlessly falls back to Browser Web Speech API.
 *
 * @param {Blob|null} audioBlob   Raw recorded audio (or null to use browser recognition)
 * @param {string} langCode       e.g. 'hi', 'mr', 'pa', 'en'
 * @returns {Promise<string>} Transcribed text
 */
export async function speechToText(audioBlob, langCode = 'hi') {
  if (audioBlob && BHASHINI_API_KEY && BHASHINI_USER_ID && !bhashiniAuthFailed) {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const targetLang = LANG_MAP[langCode] || langCode;

      const payload = {
        pipelineTasks: [
          {
            taskType: 'asr',
            config: {
              language: { sourceLanguage: targetLang },
              serviceId: DEFAULT_SERVICE_IDS.asr,
              audioFormat: 'wav',
              samplingRate: 16000,
            },
          },
        ],
        inputData: {
          audio: [{ audioContent: base64Audio }],
        },
      };

      const res = await fetch(INFERENCE_URL, {
        method: 'POST',
        headers: bhashiniHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        bhashiniAuthFailed = true;
      } else if (res.ok) {
        const json = await res.json();
        const transcript = json?.pipelineResponse?.[0]?.output?.[0]?.source;
        if (transcript) return transcript;
      }
    } catch {
      bhashiniAuthFailed = true;
    }
  }

  // Fast, instant Browser-native Web Speech API fallback
  return browserSpeechToText(langCode);
}

/**
 * Live speech recognition listener. Starts listening immediately and fires callback on results.
 */
export function startLiveSpeechRecognition({ langCode = 'hi', onTranscript, onError, onEnd }) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError(new Error('Speech recognition not supported in this browser. Please type your message.'));
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = BROWSER_LOCALE_MAP[langCode] || 'hi-IN';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; ++i) {
      if (e.results[i].isFinal) {
        final += e.results[i][0].transcript;
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    if (onTranscript) onTranscript(final || interim, Boolean(final));
  };

  rec.onerror = (e) => {
    if (onError) onError(new Error(e.error));
  };

  rec.onend = () => {
    if (onEnd) onEnd();
  };

  rec.start();
  return rec;
}

/* ------------------------------------------------------------------ */
/*  2. TTS — Text-To-Speech                                           */
/* ------------------------------------------------------------------ */

/**
 * Convert a text string to spoken audio.
 * First attempts Bhashini TTS, with automatic fallback to browser speech synthesis.
 *
 * @param {string} text
 * @param {string} langCode  e.g. 'hi', 'mr', 'pa', 'en'
 * @returns {Promise<HTMLAudioElement|null>}
 */
export async function textToSpeech(text, langCode = 'hi') {
  if (BHASHINI_API_KEY && BHASHINI_USER_ID && !bhashiniAuthFailed) {
    try {
      const targetLang = LANG_MAP[langCode] || langCode;
      const payload = {
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: { sourceLanguage: targetLang },
              serviceId: DEFAULT_SERVICE_IDS.tts,
              gender: 'female',
            },
          },
        ],
        inputData: {
          input: [{ source: text }],
        },
      };

      const res = await fetch(INFERENCE_URL, {
        method: 'POST',
        headers: bhashiniHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        bhashiniAuthFailed = true;
      } else if (res.ok) {
        const json = await res.json();
        const base64Audio = json?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
        if (base64Audio) {
          return new Audio(`data:audio/wav;base64,${base64Audio}`);
        }
      }
    } catch {
      bhashiniAuthFailed = true;
    }
  }

  // Browser speech synthesis fallback
  return browserTextToSpeech(text, langCode);
}

/* ------------------------------------------------------------------ */
/*  3. NMT — Neural Machine Translation                              */
/* ------------------------------------------------------------------ */

/**
 * Translate a single block of text from sourceLang to targetLang.
 *
 * @param {string} text
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {Promise<string>}
 */
export async function translateText(text, sourceLang = 'en', targetLang = 'hi') {
  if (sourceLang === targetLang || !text || !text.trim()) return text;

  if (BHASHINI_API_KEY && BHASHINI_USER_ID && !bhashiniAuthFailed) {
    try {
      const payload = {
        pipelineTasks: [
          {
            taskType: 'translation',
            config: {
              language: {
                sourceLanguage: LANG_MAP[sourceLang] || sourceLang,
                targetLanguage: LANG_MAP[targetLang] || targetLang,
              },
              serviceId: DEFAULT_SERVICE_IDS.translation,
            },
          },
        ],
        inputData: {
          input: [{ source: text }],
        },
      };

      const res = await fetch(INFERENCE_URL, {
        method: 'POST',
        headers: bhashiniHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        bhashiniAuthFailed = true;
      } else if (res.ok) {
        const json = await res.json();
        const translated = json?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (translated) return translated;
      }
    } catch {
      bhashiniAuthFailed = true;
    }
  }

  // Fallback endpoint
  return googleTranslateFallback(text, sourceLang, targetLang);
}

/**
 * Translate an array of text strings from sourceLang to targetLang.
 * Supports batch translating an entire dictionary in one or two calls.
 *
 * @param {string[]} texts
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {Promise<string[]>}
 */
export async function translateBatch(texts, sourceLang = 'en', targetLang = 'hi') {
  if (sourceLang === targetLang || !texts || texts.length === 0) return texts;

  // Try Bhashini Batch translation if API key is active
  if (BHASHINI_API_KEY && BHASHINI_USER_ID && !bhashiniAuthFailed) {
    try {
      const payload = {
        pipelineTasks: [
          {
            taskType: 'translation',
            config: {
              language: {
                sourceLanguage: LANG_MAP[sourceLang] || sourceLang,
                targetLanguage: LANG_MAP[targetLang] || targetLang,
              },
              serviceId: DEFAULT_SERVICE_IDS.translation,
            },
          },
        ],
        inputData: {
          input: texts.map((t) => ({ source: t })),
        },
      };

      const res = await fetch(INFERENCE_URL, {
        method: 'POST',
        headers: bhashiniHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        bhashiniAuthFailed = true;
      } else if (res.ok) {
        const json = await res.json();
        const outputs = json?.pipelineResponse?.[0]?.output;
        if (outputs && Array.isArray(outputs)) {
          return outputs.map((item, i) => item.target || texts[i]);
        }
      }
    } catch {
      bhashiniAuthFailed = true;
    }
  }

  // Fast Batch Fallback
  return googleTranslateBatchFallback(texts, sourceLang, targetLang);
}

async function googleTranslateBatchFallback(texts, sl, tl) {
  try {
    const separator = ' \n@@@\n ';
    const joinedText = texts.join(separator);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(joinedText)}`;
    const res = await fetch(url);
    const json = await res.json();
    const fullTranslated = json?.[0]?.map((x) => x?.[0]).join('') || joinedText;
    const parts = fullTranslated.split(/\s*@@@\s*/);

    if (parts.length === texts.length) {
      return parts.map((p) => p.trim());
    }

    // Fallback to parallel single translations if separator wasn't preserved
    return Promise.all(texts.map((t) => translateText(t, sl, tl)));
  } catch {
    return Promise.all(texts.map((t) => translateText(t, sl, tl)));
  }
}

/* ------------------------------------------------------------------ */
/*  Browser-native fallbacks                                          */
/* ------------------------------------------------------------------ */

function browserSpeechToText(langCode) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported in this browser.'));
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = BROWSER_LOCALE_MAP[langCode] || 'hi-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => resolve(e.results[0][0].transcript);
    rec.onerror = (e) => reject(new Error(e.error));
    rec.start();
  });
}

function browserTextToSpeech(text, langCode) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve(null);
      return;
    }
    // Cancel any active utterance
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_#`~]/g, ''); // strip markdown chars
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = BROWSER_LOCALE_MAP[langCode] || 'hi-IN';
    utter.rate = 0.95; // Clear natural pace for farmers

    utter.onend = () => resolve(null);
    utter.onerror = () => resolve(null);

    window.speechSynthesis.speak(utter);
    resolve(null);
  });
}

async function googleTranslateFallback(text, sl, tl) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json?.[0]?.map((x) => x?.[0]).join('') || text;
  } catch {
    return text;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function recordAudio(durationMs = 4000) {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: 'audio/webm' }));
      };
      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, durationMs);
    } catch (err) {
      reject(err);
    }
  });
}
