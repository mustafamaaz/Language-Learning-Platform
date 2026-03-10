const LANG_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
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

function toBcp47(code: string): string {
  return LANG_MAP[code.toLowerCase()] ?? code;
}

let currentAudio: HTMLAudioElement | null = null;

function stopAudioPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  stopAudioPlayback();
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Boolean(window.speechSynthesis?.speaking) ||
    Boolean(currentAudio && !currentAudio.paused)
  );
}

export function speak(
  text: string,
  lang: string,
  rate = 0.9
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Speech synthesis not available"));
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = toBcp47(lang);
    utterance.rate = rate;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const bcp = toBcp47(lang);
    const match =
      voices.find((v) => v.lang === bcp) ??
      voices.find((v) => v.lang.startsWith(lang));
    if (match) utterance.voice = match;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") {
        resolve();
      } else {
        reject(e);
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

function playAudioFile(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopAudioPlayback();
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      currentAudio = null;
      reject(new Error(`Failed to play ${url}`));
    };
    audio.play().catch(reject);
  });
}

export async function speakWithFallback(
  text: string,
  lang: string,
  audioUrl?: string,
  rate?: number
): Promise<void> {
  if (audioUrl) {
    try {
      await playAudioFile(audioUrl);
      return;
    } catch {
      // audio file unavailable — fall through to TTS
    }
  }
  return speak(text, lang, rate);
}

export function getAvailableVoices(lang?: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (!lang) return voices;
  const bcp = toBcp47(lang);
  return voices.filter(
    (v) => v.lang === bcp || v.lang.startsWith(lang)
  );
}
