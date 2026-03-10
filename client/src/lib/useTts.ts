import { useCallback, useEffect, useRef, useState } from "react";
import {
  speak as ttsSpeak,
  speakWithFallback,
  stopSpeaking,
  isSpeaking as ttsIsSpeaking,
} from "@/lib/tts";

export function useTts(defaultLang: string) {
  const [speaking, setSpeaking] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopSpeaking();
    };
  }, []);

  const speak = useCallback(
    async (text: string, lang?: string, audioUrl?: string, rate?: number) => {
      if (speaking) stopSpeaking();
      setSpeaking(true);
      try {
        await speakWithFallback(text, lang ?? defaultLang, audioUrl, rate);
      } catch {
        // silently ignore TTS errors
      } finally {
        if (mountedRef.current) setSpeaking(false);
      }
    },
    [defaultLang, speaking]
  );

  const stop = useCallback(() => {
    stopSpeaking();
    if (mountedRef.current) setSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking: speaking,
    checkSpeaking: ttsIsSpeaking,
  };
}
