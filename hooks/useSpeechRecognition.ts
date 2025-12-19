
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionProps {
  lang: string;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
}

export const useSpeechRecognition = ({ lang, onResult, onError }: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldBeListening = useRef(false);

  const setupRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      onError("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if it was stopped by the browser but the user still wants to listen
      if (shouldBeListening.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Could not auto-restart recognition", e);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore some common harmless errors that trigger onend anyway
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        console.warn("Recognition warning:", event.error);
        return;
      }
      console.error("Speech Recognition Error:", event.error);
      onError(event.error);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        onResult(interimTranscript.trim(), false);
      }
    };

    recognitionRef.current = recognition;
  }, [lang, onResult, onError]);

  useEffect(() => {
    setupRecognition();
    return () => {
      shouldBeListening.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [setupRecognition]);

  const startListening = useCallback(() => {
    shouldBeListening.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Recognition might already be starting
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldBeListening.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, startListening, stopListening };
};
