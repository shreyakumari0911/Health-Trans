
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LANGUAGES, TranscriptEntry } from './types';
import { translateMedicalText, generateMedicalSpeech, decodePcmAudio } from './services/geminiService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { TranscriptList } from './components/TranscriptList';

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('es-ES');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [speaker, setSpeaker] = useState<'provider' | 'patient'>('provider');
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null); // Entry ID being spoken
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const disclaimerButtonRef = useRef<HTMLButtonElement | null>(null);
  const appContentRef = useRef<HTMLDivElement | null>(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcripts, interimText]);

  // Show medical safety disclaimer only on first load
  useEffect(() => {
    try {
      const ack = localStorage.getItem('medical_disclaimer_ack');
      if (!ack) setShowDisclaimer(true);
    } catch {}
  }, []);

  // Focus the acknowledge button when modal appears for accessibility
  useEffect(() => {
    if (showDisclaimer) {
      disclaimerButtonRef.current?.focus();
    }
  }, [showDisclaimer]);

  // Trap focus on the disclaimer and block interaction with the app until acknowledged
  useEffect(() => {
    const content = appContentRef.current;
    if (content) {
      if (showDisclaimer) {
        content.setAttribute('inert', '');
        content.setAttribute('aria-hidden', 'true');
      } else {
        content.removeAttribute('inert');
        content.removeAttribute('aria-hidden');
      }
    }

    if (!showDisclaimer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        disclaimerButtonRef.current?.focus();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [showDisclaimer]);

  const handleTranslation = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    setError(null);
    try {
      const translated = await translateMedicalText(text, sourceLang, targetLang);
      
      const newEntry: TranscriptEntry = {
        id: crypto.randomUUID(),
        originalText: text,
        translatedText: translated,
        timestamp: new Date(),
        sourceLang,
        targetLang,
        speaker
      };
      
      setTranscripts(prev => [...prev, newEntry]);
    } catch (err) {
      setError("Medical translation service encountered an issue.");
    } finally {
      setIsTranslating(false);
      setInterimText('');
    }
  }, [sourceLang, targetLang, speaker]);

  const onSpeechResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      handleTranslation(text);
    } else {
      setInterimText(text);
    }
  }, [handleTranslation]);

  const onSpeechError = useCallback((err: string) => {
    if (err === 'not-allowed') {
      setError("Microphone access denied. Please check browser permissions.");
    } else {
      setError(`Speech Recognition Error: ${err}`);
    }
  }, []);

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    lang: sourceLang,
    onResult: onSpeechResult,
    onError: onSpeechError
  });

  const speakText = async (text: string, langCode: string, entryId: string) => {
    if (isSpeaking) return;
    
    setIsSpeaking(entryId);
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      
      // We use Gemini TTS for high-quality, clear medical pronunciation
      const voice = langCode.startsWith('en') ? 'Kore' : 'Zephyr';
      
      const audioData = await generateMedicalSpeech(text, voice);
      const audioBuffer = await decodePcmAudio(audioData, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(null);
      source.start();
    } catch (err) {
      console.error("Gemini TTS failed, falling back to browser TTS", err);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.onend = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = () => {
    setError(null);
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  return (
    <div className="max-w-full mx-auto bg-gradient-to-b from-slate-50 via-blue-50 to-slate-50 relative overflow-hidden selection:bg-blue-200/80 f-container px-3 sm:px-4 md:px-6">
      <div ref={appContentRef} className="flex flex-col h-screen">
      {/* Decorative background elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Premium Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100/50 px-3 sm:px-5 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.05)] f-header">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-300/40 transform hover:scale-105 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-900 text-slate-900 tracking-tight">HealthTrans</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-widest mt-0.5">AI-Powered Medical Interpreter</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 bg-slate-100/40 backdrop-blur-sm rounded-2xl p-1.5">
          <button 
            onClick={() => setSpeaker('provider')}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-300 transform ${
              speaker === 'provider' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-300/40 scale-105' 
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            🏥 Provider
          </button>
          <button 
            onClick={() => setSpeaker('patient')}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all duration-300 transform ${
              speaker === 'patient' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-300/40 scale-105' 
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            👤 Patient
          </button>
        </div>
      </header>

      {/* Advanced Language Selector Bar */}
      <div className="bg-white/70 backdrop-blur-lg p-3 sm:p-4 border-b border-slate-100/40 flex items-center justify-center gap-2 sm:gap-3 sticky top-[72px] sm:top-[85px] z-10 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
        <div className="group flex items-center bg-white rounded-2xl px-5 py-3 border-2 border-slate-100 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-300 focus-within:border-blue-400 focus-within:shadow-lg">
          <span className="mr-2 sm:mr-3 text-xl sm:text-2xl shrink-0">{LANGUAGES.find(l => l.code === sourceLang)?.flag}</span>
          <select 
            value={sourceLang} 
            onChange={(e) => setSourceLang(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold focus:outline-none text-slate-700 cursor-pointer pr-2"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={swapLanguages}
          title="Swap Languages"
          className="p-3 bg-gradient-to-br from-slate-100 to-slate-50 hover:from-blue-100 hover:to-blue-50 rounded-full transition-all duration-300 text-slate-600 hover:text-blue-600 active:rotate-180 transform hover:scale-110 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
          </svg>
        </button>

        <div className="group flex items-center bg-white rounded-2xl px-5 py-3 border-2 border-slate-100 hover:border-indigo-300 shadow-md hover:shadow-lg transition-all duration-300 focus-within:border-indigo-400 focus-within:shadow-lg">
          <span className="mr-2 sm:mr-3 text-xl sm:text-2xl shrink-0">{LANGUAGES.find(l => l.code === targetLang)?.flag}</span>
          <select 
            value={targetLang} 
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold focus:outline-none text-slate-700 cursor-pointer pr-2"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content / Transcript Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 custom-scrollbar bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-50">
        {error && (
          <div className="mb-8 p-5 bg-gradient-to-r from-red-50 to-red-50/50 border-2 border-red-200/60 rounded-3xl text-red-700 text-sm font-semibold flex items-center space-x-4 animate-in fade-in zoom-in slide-in-from-top-4 shadow-lg shadow-red-100/40 f-card">
            <div className="bg-red-100/80 p-2.5 rounded-xl flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span>{error}</span>
          </div>
        )}

        <TranscriptList 
          transcripts={transcripts} 
          onSpeak={(text, lang, id) => speakText(text, lang, id || '')} 
          isSpeakingId={isSpeaking}
        />

        {/* Interim/Live Transcription */}
        {interimText && (
          <div className="mt-8 p-6 rounded-3xl bg-white/90 border-2 border-blue-200/60 shadow-lg shadow-blue-100/40 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 f-card">
            <div className="flex items-center space-x-3 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">🎙️ Listening in Real-Time</span>
            </div>
            <p className="text-slate-700 text-lg leading-relaxed font-semibold">{interimText}</p>
          </div>
        )}

        {isTranslating && (
          <div className="mt-8 flex items-center space-x-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-5 rounded-3xl border-2 border-indigo-200/60 shadow-lg shadow-indigo-100/40 animate-in fade-in backdrop-blur-sm f-card">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-bounce"></div>
            </div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">⚕️ AI Processing Medical Accuracy...</span>
          </div>
        )}
      </main>

      {/* Premium Control Bar */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100/40 px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center space-y-5 sm:space-y-6 shadow-[0_-8px_40px_rgba(0,0,0,0.08)] z-20 f-footer">
        <div className="flex items-center justify-center w-full relative">
          {isListening && (
            <div className="absolute -top-3 sm:-top-4 text-center">
              <span className="text-[10px] sm:text-xs font-semibold text-blue-600/90 animate-pulse">
                Listening securely…
              </span>
            </div>
          )}
          <button
            onClick={toggleRecording}
            className={`group relative z-10 flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full transition-all duration-500 transform active:scale-95 font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider ${
              isListening 
                ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 shadow-[0_0_40px_rgba(239,68,68,0.5)]' 
                : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-800 shadow-[0_0_40px_rgba(37,99,235,0.4)]'
            }`}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 6a3 3 0 013-3h4a1 1 0 00-1-1H6a5 5 0 00-5 5v2a1 1 0 001 1h16a1 1 0 001-1v-2a5 5 0 00-5-5h-4a1 1 0 00-1 1v1a3 3 0 01-3 3H3z"/>
              </svg>
            )}
            
            {/* Visual feedback rings */}
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20"></div>
                <div className="absolute -inset-3 rounded-full border-3 border-red-300 animate-pulse"></div>
              </>
            )}
          </button>
          
          <div className="absolute top-24 sm:top-28 md:top-32 text-center">
            <span className={`text-xs sm:text-sm font-black uppercase tracking-[0.15em] transition-all duration-300 ${isListening ? 'text-red-600 scale-110' : 'text-slate-500'}`}>
              {isListening ? '🔴 RECORDING' : '🎤 TAP TO TALK'}
            </span>
          </div>
        </div>

        <div className="pt-4 sm:pt-6 text-center max-w-md">
          <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-relaxed">
            🛡️ Privacy-focused prototype • Patient data safeguarded during use
          </p>
        </div>
      </div>

      </div>

      {/* One-time Medical Safety Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true"></div>
          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="disclaimer-title"
            aria-describedby="disclaimer-desc"
            className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 id="disclaimer-title" className="text-lg font-bold text-slate-900">Medical Safety Disclaimer</h2>
                <p id="disclaimer-desc" className="mt-2 text-slate-600">
                  This tool assists communication between patients and healthcare providers and does not replace professional medical judgment.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                ref={disclaimerButtonRef}
                onClick={() => {
                  try { localStorage.setItem('medical_disclaimer_ack', 'true'); } catch {}
                  setShowDisclaimer(false);
                }}
                className="f-btn f-btn--primary"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
