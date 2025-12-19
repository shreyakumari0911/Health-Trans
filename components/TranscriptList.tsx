
import React from 'react';
import { TranscriptEntry, LANGUAGES } from '../types';

interface TranscriptListProps {
  transcripts: TranscriptEntry[];
  onSpeak: (text: string, langCode: string, entryId: string) => void;
  isSpeakingId?: string | null;
}

export const TranscriptList: React.FC<TranscriptListProps> = ({ transcripts, onSpeak, isSpeakingId }) => {
  const getLangName = (code: string) => LANGUAGES.find(l => l.code === code)?.name || code;

  // Common medical terms to highlight (case-insensitive)
  const MEDICAL_TERMS = new Set<string>([
    'hypertension',
    'diabetes',
    'dosage',
    'insulin',
    'fever',
    'blood pressure',
    'antibiotic',
    'allergy'
  ]);

  // Utility: wrap detected medical terms in a styled span, preserving plain text between matches
  const highlightMedicalTerms = (text: string): React.ReactNode => {
    const escaped = Array.from(MEDICAL_TERMS)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;
      if (start > lastIndex) {
        nodes.push(text.slice(lastIndex, start));
      }
      nodes.push(
        <span key={`${start}-${end}`} className="med-highlight">
          {match[0]}
        </span>
      );
      lastIndex = end;
    }
    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }
    return nodes.length ? nodes : text;
  };

  // UI utility: translation confidence based on relative length
  const getTranslationConfidence = (original: string, translated: string): 'high' | 'medium' => {
    const o = original?.trim().length || 0;
    const t = translated?.trim().length || 0;
    if (o === 0) return 'medium';
    return t / o >= 0.8 ? 'high' : 'medium';
  };

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] text-slate-400 space-y-8">
        <div className="bg-white/80 backdrop-blur-sm p-10 rounded-3xl shadow-lg border-2 border-slate-100/60 flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
          <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center text-blue-500 mb-8 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 6a3 3 0 013-3h4a1 1 0 00-1-1H6a5 5 0 00-5 5v2a1 1 0 001 1h16a1 1 0 001-1v-2a5 5 0 00-5-5h-4a1 1 0 00-1 1v1a3 3 0 01-3 3H3z"/>
            </svg>
          </div>
          <p className="text-center font-bold text-slate-800 text-2xl mb-3">Ready for Consultation</p>
          <p className="text-base text-center text-slate-500 max-w-sm leading-relaxed font-medium">Start speaking now and watch real-time medical translation happen instantly. Your words matter.</p>
          <p className="mt-3 text-xs text-slate-400 font-semibold">🔒 Conversations are not stored or shared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 pb-28 sm:pb-32">
      {transcripts.map((entry, idx) => (
        <div key={entry.id} className="flex flex-col space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{animationDelay: `${idx * 50}ms`} }>
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${entry.speaker === 'provider' ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-300/50' : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-300/50'}`}></div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                {entry.speaker === 'provider' ? '🏥 Healthcare Provider' : '👤 Patient'}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border hidden sm:inline-block ${
                  entry.speaker === 'provider'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {entry.speaker === 'provider' ? 'Healthcare Provider' : 'Patient'}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tabular-nums">
              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Source Message Card */}
            <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-md border-2 border-slate-100/60 hover:shadow-lg hover:border-blue-200/80 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-blue-700 bg-blue-50/80 backdrop-blur px-4 py-1.5 rounded-full uppercase tracking-tighter border border-blue-200/50">
                  Original • {getLangName(entry.sourceLang)}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium text-sm sm:text-base break-words">{highlightMedicalTerms(entry.originalText)}</p>
            </div>

            {/* Translation Card */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-cyan-50/50 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-md border-2 border-indigo-200/50 hover:shadow-lg hover:border-indigo-300/80 transition-all duration-300 transform hover:-translate-y-1 f-card f-card--accent">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-white/60 backdrop-blur px-4 py-1.5 rounded-full uppercase tracking-tighter border border-indigo-200/50">
                    AI-Assisted Translation • {getLangName(entry.targetLang)}
                  </span>
                  <span className="relative inline-flex group">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-describedby={`tip-${entry.id}`}
                      className={`outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                        getTranslationConfidence(entry.originalText, entry.translatedText) === 'high'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {getTranslationConfidence(entry.originalText, entry.translatedText) === 'high' ? 'High Confidence' : 'Medium Confidence'}
                    </span>
                    <div
                      id={`tip-${entry.id}`}
                      role="tooltip"
                      className="absolute z-30 left-1/2 -translate-x-1/2 -top-2 -translate-y-full px-3 py-2 rounded-lg text-[11px] bg-slate-900 text-white shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 max-w-[80vw]"
                    >
                      Based on translation completeness and structure.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </span>
                </div>
                <button
                  onClick={() => onSpeak(entry.translatedText, entry.targetLang, entry.id)}
                    className={`f-btn ${
                      isSpeakingId === entry.id
                        ? 'f-btn--primary f-btn--pulse-active'
                        : 'f-btn--secondary'
                    }`}
                  aria-label="Play translation"
                  title="Play audio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.414 4.243 1 1 0 11-1.414-1.415A3.987 3.987 0 0013 10a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-slate-700 leading-relaxed font-semibold text-sm sm:text-base break-words">{highlightMedicalTerms(entry.translatedText)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
