import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    let active = true;
    fetch("/api/hello")
      .then((res) => res.json())
      .then((data: { message?: string }) => {
        if (active) {
          setMessage(data.message ?? "No message returned");
        }
      })
      .catch(() => {
        if (active) {
          setMessage("API unavailable. Is the server running?");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            PolyGlot Dynamic
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Language Learning Platform
          </h1>
          <p className="text-base text-slate-600">
            Vite + TypeScript + shadcn/ui on the frontend, Express on the backend.
          </p>
        </div>

        <div className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            API Status
          </p>
          <p className="mt-2 text-lg font-medium text-slate-900">{message}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => window.location.reload()}>Refresh</Button>
          <Button variant="secondary" onClick={() => setMessage("Hello from UI")}>
            Simulate Frontend Message
          </Button>
        </div>
      </div>
    </div>
  );
}
