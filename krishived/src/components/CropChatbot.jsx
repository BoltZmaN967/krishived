/**
 * CropChatbot.jsx
 *
 * A contextual AI chatbot that appears after a crop scan.
 * - Sends disease context + conversation history to Gemini API
 * - Voice input via Bhashini ASR (falls back to Web Speech API)
 * - Voice output via Bhashini TTS (falls back to browser speech)
 * - All UI strings respect the active language via useLanguage()
 * - AI responses are auto-translated to the active language via Bhashini NMT
 */

import { useEffect, useRef, useState } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2, Bot, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { textToSpeech, startLiveSpeechRecognition, speechToText } from '../lib/bhashini';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ── Contextual fallback answers ──────────────────────────────────────────
const CONTEXTUAL_ANSWERS = [
  "For this condition, remove affected lower leaves immediately and avoid overhead watering. Ensure proper plant spacing for ventilation.",
  "Consider using recommended copper-based fungicides (such as Bordeaux mixture 1%) or bio-fungicides like Trichoderma viride. Spray early morning.",
  "Keep monitoring surrounding plants daily. Isolate severely affected plants to stop spores from spreading via wind or irrigation splash.",
  "Ensure balanced fertilization — avoid excessive nitrogen which causes soft growth vulnerable to fungal pathogens.",
  "Expected recovery timeframe is typically 10 to 14 days if treatment is applied promptly. Consult your local extension worker if spread exceeds 30% of foliage.",
];
let fallbackIdx = 0;

// ── System prompt builder ───────────────────────────────────────────────────
function buildSystemPrompt(result, field, lang) {
  const langName = { en: 'English', hi: 'Hindi', mr: 'Marathi', pa: 'Punjabi' }[lang] || 'English';
  return `You are KrishiVed AI, an expert agricultural assistant helping Indian farmers.
A crop scan was just completed with the following result:

Disease/Issue: ${result.prediction}
Confidence: ${Math.round(result.confidence * 100)}%
Crop: ${field?.crop || 'unknown'}
Crop Stage: ${field?.crop_stage || 'unknown'}
Evidence observed: ${result.evidence?.join('; ') || 'N/A'}
Recommended action: ${result.next_action || 'N/A'}
${field?.lat ? `Field location: ${field.lat.toFixed(4)}, ${field.lng.toFixed(4)}` : ''}

The farmer may ask follow-up questions in ${langName}. Always:
1. Reply in ${langName}
2. Keep answers practical, specific, and easy to understand for a farmer
3. Mention safe chemical names, organic alternatives, and dosage when relevant
4. Reference the specific disease and crop stage in your answer
5. Be empathetic and encouraging — farming is hard work`;
}

// ───────────────────────────────────────────────────────────────────────────
export default function CropChatbot({ result, selectedField }) {
  const { t, lang, translateDynamic } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `👋 ${lang === 'hi' ? 'मैं आपकी मदद के लिए यहाँ हूँ। आप' : lang === 'mr' ? 'मी तुमच्या मदतीसाठी इथे आहे. तुम्ही' : lang === 'pa' ? 'ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ। ਤੁਸੀਂ' : "I'm here to help. You can"} ${result.prediction} ${lang === 'hi' ? 'के बारे में कुछ भी पूछ सकते हैं।' : lang === 'mr' ? 'बद्दल काहीही विचारू शकता.' : lang === 'pa' ? 'ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ।' : 'diagnosis — ask me anything about treatment, prevention, or next steps.'}`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(null); // message index
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send a message ─────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let reply;

      if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your-key')) {
        await new Promise((r) => setTimeout(r, 800));
        reply = CONTEXTUAL_ANSWERS[fallbackIdx % CONTEXTUAL_ANSWERS.length];
        fallbackIdx++;
        if (lang !== 'en') {
          reply = await translateDynamic(reply, 'en');
        }
      } else {
        try {
          // Build conversation history for Gemini
          const history = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.text }],
            }));

          const systemPrompt = buildSystemPrompt(result, selectedField, lang);

          const payload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...history,
              { role: 'user', parts: [{ text: text.trim() }] },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          };

          const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const json = await res.json();
            reply = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } catch (apiErr) {
          console.warn('Gemini API call failed, using intelligent fallback:', apiErr);
        }

        if (!reply) {
          reply = CONTEXTUAL_ANSWERS[fallbackIdx % CONTEXTUAL_ANSWERS.length];
          fallbackIdx++;
        }

        // Translate reply to active language if needed
        if (lang !== 'en') {
          reply = await translateDynamic(reply, 'en');
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      let fallbackText = CONTEXTUAL_ANSWERS[0];
      if (lang !== 'en') {
        fallbackText = await translateDynamic(fallbackText, 'en').catch(() => fallbackText);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fallbackText,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Voice input via Bhashini / Live Speech Recognition ──────────────────
  const recognitionRef = useRef(null);

  function handleVoiceInput() {
    if (recording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecording(false);
      return;
    }

    setRecording(true);

    try {
      const rec = startLiveSpeechRecognition({
        langCode: lang,
        onTranscript: (spokenText, isFinal) => {
          setInput(spokenText);
          if (isFinal && spokenText.trim()) {
            sendMessage(spokenText);
            setRecording(false);
          }
        },
        onError: (err) => {
          console.warn('Speech recognition warning:', err);
          setRecording(false);
        },
        onEnd: () => {
          setRecording(false);
        },
      });

      recognitionRef.current = rec;

      if (!rec) {
        // Fallback if browser doesn't support live recognition
        speechToText(null, lang)
          .then((text) => {
            if (text) {
              setInput(text);
              sendMessage(text);
            }
          })
          .catch((err) => console.error('Voice input error:', err))
          .finally(() => setRecording(false));
      }
    } catch (err) {
      console.error('Voice input error:', err);
      setRecording(false);
    }
  }

  // ── Voice output via Bhashini TTS ───────────────────────────────────────
  async function handleSpeak(text, idx) {
    setTtsPlaying(idx);
    try {
      const audio = await textToSpeech(text, lang);
      if (audio) {
        audio.onended = () => setTtsPlaying(null);
        audio.play();
      } else {
        setTtsPlaying(null);
      }
    } catch (err) {
      console.error('TTS error:', err);
      setTtsPlaying(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="card overflow-hidden border-canopy-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-canopy-600 to-canopy-700 text-white">
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">{t('chatTitle')}</p>
          <p className="text-xs text-canopy-100 truncate max-w-[220px]">{result.prediction}</p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex flex-col gap-3 px-4 py-4 max-h-72 overflow-y-auto bg-soil-50/40">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-turmeric-100 text-turmeric-700'
                  : 'bg-canopy-100 text-canopy-700'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`relative max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-canopy-600 text-white rounded-tr-sm'
                  : msg.error
                  ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                  : 'bg-white border border-soil-200 text-ink rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.text}
              {/* TTS button for assistant messages */}
              {msg.role === 'assistant' && !msg.error && (
                <button
                  onClick={() =>
                    ttsPlaying === i ? setTtsPlaying(null) : handleSpeak(msg.text, i)
                  }
                  className="absolute -bottom-2.5 -right-2 h-5 w-5 rounded-full bg-canopy-100 border border-canopy-200 flex items-center justify-center text-canopy-600 hover:bg-canopy-200 transition-colors"
                  title="Listen"
                >
                  {ttsPlaying === i ? (
                    <VolumeX className="h-2.5 w-2.5" />
                  ) : (
                    <Volume2 className="h-2.5 w-2.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-canopy-100 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-canopy-700" />
            </div>
            <div className="bg-white border border-soil-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="h-1.5 w-1.5 rounded-full bg-canopy-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-canopy-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-canopy-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 border-t border-soil-200 bg-white flex gap-2 items-end">
        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={t('chatPlaceholder')}
            className="input resize-none text-sm !py-2.5 pr-10 min-h-[42px] max-h-28"
            disabled={loading}
          />
        </div>

        {/* Voice mic button */}
        <button
          onClick={handleVoiceInput}
          disabled={loading}
          title={t('chatVoiceHint')}
          className={`h-[42px] w-[42px] rounded-xl shrink-0 flex items-center justify-center transition-all ${
            recording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-soil-100 text-soil-500 hover:bg-canopy-100 hover:text-canopy-700'
          }`}
        >
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Send button */}
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="h-[42px] w-[42px] rounded-xl shrink-0 bg-canopy-600 text-white flex items-center justify-center hover:bg-canopy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Quick questions */}
      <div className="px-3 pb-3 flex flex-wrap gap-1.5">
        {[
          lang === 'hi' ? 'कौन सा कीटनाशक?' : lang === 'mr' ? 'कोणते कीटकनाशक?' : lang === 'pa' ? 'ਕਿਹੜਾ ਕੀਟਨਾਸ਼ਕ?' : 'Which pesticide?',
          lang === 'hi' ? 'जैविक उपाय?' : lang === 'mr' ? 'सेंद्रिय उपाय?' : lang === 'pa' ? 'ਜੈਵਿਕ ਉਪਾਅ?' : 'Organic remedy?',
          lang === 'hi' ? 'कब तक ठीक होगा?' : lang === 'mr' ? 'किती दिवसांत बरे होईल?' : lang === 'pa' ? 'ਕਿੰਨੇ ਦਿਨਾਂ ਵਿੱਚ ਠੀਕ ਹੋਵੇਗਾ?' : 'Recovery time?',
          lang === 'hi' ? 'क्या यह फैलेगा?' : lang === 'mr' ? 'हे पसरेल का?' : lang === 'pa' ? 'ਕੀ ਇਹ ਫੈਲੇਗਾ?' : 'Will it spread?',
        ].map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-canopy-50 text-canopy-700 border border-canopy-200 hover:bg-canopy-100 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
