import { useCallback } from "react";
import { useTts } from "@/lib/useTts";

type SpeakButtonProps = {
  text: string;
  lang: string;
  audioUrl?: string;
  rate?: number;
  size?: "sm" | "md";
  className?: string;
};

export function SpeakButton({
  text,
  lang,
  audioUrl,
  rate,
  size = "md",
  className = "",
}: SpeakButtonProps) {
  const { speak, stop, isSpeaking } = useTts(lang);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSpeaking) {
        stop();
      } else {
        speak(text, lang, audioUrl, rate);
      }
    },
    [isSpeaking, speak, stop, text, lang, audioUrl, rate]
  );

  const sizeClasses =
    size === "sm" ? "h-6 w-6 p-0.5" : "h-8 w-8 p-1";

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isSpeaking ? "Stop" : "Listen"}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors ${
        isSpeaking
          ? "animate-pulse border-blue-400 bg-blue-100 text-blue-600"
          : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
      } ${sizeClasses} ${className}`}
    >
      {isSpeaking ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 10h6v4H9z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.414v13.172a1 1 0 01-1.707.707L5.586 15z"
          />
        </svg>
      )}
    </button>
  );
}
