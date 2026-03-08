import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("Google sign-in did not return a credential.");
      return;
    }
    try {
      await login(response.credential);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_10%_80%,#e0f2fe,transparent_45%),radial-gradient(circle_at_90%_20%,#fae8ff,transparent_45%)]">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-xl backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            PolyGlot Dynamic
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue your language learning journey
          </p>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError("Google sign-in failed.")}
            theme="outline"
            size="large"
            shape="pill"
            width="320"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
