import { useCallback, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string | undefined;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: ResultEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface ResultEvent {
  results?: Array<{ 0?: { transcript?: string } }>;
}

interface ErrorEvent {
  error: string;
}

const SpeechRecognition: (new () => SpeechRecognitionInstance) | undefined =
  typeof window !== "undefined"
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) as
        | (new () => SpeechRecognitionInstance)
        | undefined
    : undefined;

function toBcp47(lang: string): string {
  const map: Record<string, string> = {
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT",
    pt: "pt-BR",
    nl: "nl-NL",
    pl: "pl-PL",
    ru: "ru-RU",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    ar: "ar-SA",
    tr: "tr-TR",
    hi: "hi-IN",
    ur: "ur-PK",
  };
  const code = lang.toLowerCase().split("-")[0];
  return map[code] ?? lang;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(SpeechRecognition);
}

export function useSpeechRecognition(lang?: string) {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    setError(null);
    setTranscript("");

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang ? toBcp47(lang) : undefined;
    rec.maxAlternatives = 1;

    rec.onresult = (e: ResultEvent) => {
      let full = "";
      const results = (e as { results?: Array<{ 0?: { transcript?: string } }> }).results;
      for (let i = 0; i < (results?.length ?? 0); i++) {
        const r = results?.[i];
        full += r?.[0]?.transcript ?? "";
      }
      if (full.trim()) setTranscript(full.trim());
    };

    rec.onerror = (e: ErrorEvent) => {
      if (e.error === "no-speech") {
        setTranscript("");
      } else if (e.error === "aborted") {
        // user or we stopped; ignore
      } else {
        setError(e.error === "not-allowed" ? "Microphone access denied." : String(e.error));
      }
      stop();
    };

    rec.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recognition.");
    }
  }, [lang, stop]);

  return {
    transcript,
    isListening,
    start,
    stop,
    error,
    isSupported: isSpeechRecognitionSupported(),
  };
}
