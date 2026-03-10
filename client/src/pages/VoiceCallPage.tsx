import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/contexts/UserPreferencesContext";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useTts } from "@/lib/useTts";
import {
  streamConversation,
  getConversationStatus,
  type ConversationMessage,
} from "@/lib/conversationApi";
import { cn } from "@/lib/utils";

const MAX_HISTORY = 40;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function VoiceCallPage() {
  const navigate = useNavigate();
  const { sourceName, targetName, targetCode, proficiency } = usePreferences();
  const { speak, stop: stopTts, isSpeaking } = useTts(targetCode || "en");
  const {
    transcript,
    isListening,
    start: startListening,
    stop: stopListening,
    error: recognitionError,
    isSupported,
  } = useSpeechRecognition(targetCode);

  const [callActive, setCallActive] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevListeningRef = useRef(false);
  const sentenceBufferRef = useRef("");
  const abortRef = useRef(false);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef(false);

  useEffect(() => {
    getConversationStatus().then((s) => setLlmConfigured(s.configured));
  }, []);

  useEffect(() => {
    if (!callActive) return;
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [callActive]);

  const processTtsQueue = useCallback(
    (lang: string) => {
      if (ttsPlayingRef.current || ttsQueueRef.current.length === 0 || abortRef.current) return;
      ttsPlayingRef.current = true;
      const runNext = () => {
        if (abortRef.current || ttsQueueRef.current.length === 0) {
          ttsPlayingRef.current = false;
          return;
        }
        const s = ttsQueueRef.current.shift()?.trim();
        if (!s) return runNext();
        speak(s, lang).then(runNext);
      };
      runNext();
    },
    [speak]
  );

  const queueAndSpeak = useCallback(
    (text: string, lang: string) => {
      const sentences = (text.match(/[^.!?]+[.!?]?/g) ?? []).map((s) => s.trim()).filter(Boolean);
      if (sentences.length === 0) return;
      ttsQueueRef.current.push(...sentences);
      processTtsQueue(lang);
    },
    [processTtsQueue]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || !sourceName || !targetName || !targetCode) return;

      const history = conversationHistory.slice(-MAX_HISTORY);
      setIsProcessing(true);
      setDisplayedResponse("");
      setSessionError(null);
      abortRef.current = false;
      sentenceBufferRef.current = "";

      const newHistory: ConversationMessage[] = [
        ...history,
        { role: "user", content: message },
      ];
      setConversationHistory(newHistory);

      try {
        await streamConversation(
          {
            message: message.trim(),
            sourceLanguage: sourceName,
            targetLanguage: targetName,
            proficiency,
            history: history.slice(-MAX_HISTORY),
          },
          {
            onChunk: (chunk) => {
              if (abortRef.current) return;
              sentenceBufferRef.current += chunk;
              setDisplayedResponse((prev) => prev + chunk);
              const match = sentenceBufferRef.current.match(/^([^.!?]*[.!?])/);
              if (match) {
                const sentence = match[1];
                sentenceBufferRef.current = sentenceBufferRef.current.slice(sentence.length);
                queueAndSpeak(sentence, targetCode);
              }
            },
            onDone: () => {
              const remainder = sentenceBufferRef.current.trim();
              if (remainder && !abortRef.current) {
                queueAndSpeak(remainder, targetCode);
              }
            },
            onError: (err) => setSessionError(err),
          }
        );
      } catch {
        // Error already set via onError
      } finally {
        setIsProcessing(false);
      }
    },
    [
      sourceName,
      targetName,
      targetCode,
      proficiency,
      conversationHistory,
      queueAndSpeak,
    ]
  );

  useEffect(() => {
    if (!callActive || isProcessing) return;
    const wasListening = prevListeningRef.current;
    prevListeningRef.current = isListening;

    if (wasListening && !isListening && transcript.trim()) {
      sendMessage(transcript);
    }
  }, [callActive, isListening, isProcessing, transcript, sendMessage]);

  const prevProcessingRef = useRef(false);
  useEffect(() => {
    const wasProcessing = prevProcessingRef.current;
    prevProcessingRef.current = isProcessing;
    if (wasProcessing && !isProcessing && displayedResponse) {
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: displayedResponse },
      ]);
      setDisplayedResponse("");
    }
  }, [isProcessing, displayedResponse]);

  const handleEndCall = useCallback(() => {
    abortRef.current = true;
    stopTts();
    stopListening();
    setCallActive(false);
    setCallDuration(0);
    setConversationHistory([]);
    setDisplayedResponse("");
    setSessionError(null);
  }, [stopTts, stopListening]);

  const handleStartCall = useCallback(() => {
    setCallActive(true);
    setSessionError(null);
  }, []);

  const handleMicPress = useCallback(() => {
    if (!callActive) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [callActive, isListening, startListening, stopListening]);

  const messagesToShow = conversationHistory;
  const showStreamingBubble = displayedResponse && isProcessing;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_10%_80%,#e0f2fe,transparent_45%),radial-gradient(circle_at_90%_20%,#fae8ff,transparent_45%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
        <TopNav />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
              {sourceName || "—"}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <div className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
              {targetName || "—"}
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
            {proficiency}
          </span>
        </div>

        {llmConfigured === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            AI voice call is not configured. Add GEMINI_API_KEY or GROK_API_KEY to
            server/.env
          </div>
        )}

        {!isSupported && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            Speech recognition is not supported in this browser. Try Chrome or Edge.
          </div>
        )}

        {(recognitionError || sessionError) && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {recognitionError || sessionError}
          </div>
        )}

        {!callActive ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-white/80 p-10 shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                AI Voice Call
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Practice {targetName} in a real-time conversation. Tap the mic to
                speak when in the call.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleStartCall}
              disabled={!llmConfigured || !isSupported}
            >
              Start Call
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">
              <span className="font-mono text-lg font-medium text-slate-700">
                {formatDuration(callDuration)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndCall}
                className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              >
                End Call
              </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-col gap-4">
                {messagesToShow.length === 0 && !showStreamingBubble && (
                  <p className="text-center text-sm text-slate-500">
                    Tap the mic to speak. The AI will respond when you pause.
                  </p>
                )}
                {messagesToShow.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2",
                      m.role === "user"
                        ? "ml-auto bg-blue-600 text-white"
                        : "mr-auto bg-slate-100 text-slate-800"
                    )}
                  >
                    <p className="text-sm">{m.content}</p>
                  </div>
                ))}
                {showStreamingBubble && (
                  <div className="mr-auto max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-slate-800">
                    <p className="text-sm">{displayedResponse}</p>
                    <span className="mt-1 inline-block h-1 w-1 animate-pulse rounded-full bg-slate-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
              <button
                type="button"
                onClick={handleMicPress}
                disabled={isProcessing}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all",
                  isListening
                    ? "border-red-500 bg-red-50 text-red-600 animate-pulse"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                )}
              >
                {isListening ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v0 0 0 14z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19v-5"
                    />
                  </svg>
                )}
              </button>
              <p className="text-sm text-slate-500">
                {isListening
                  ? "Listening... speak now"
                  : isProcessing
                    ? "AI is thinking..."
                    : "Tap to speak"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
