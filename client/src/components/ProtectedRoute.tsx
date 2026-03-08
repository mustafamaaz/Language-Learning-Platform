import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/UserPreferencesContext";

type Props = {
  requiredRole?: "admin";
  requireConfig?: boolean;
};

export function ProtectedRoute({ requiredRole, requireConfig }: Props) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const { isConfigured } = usePreferences();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireConfig && !isConfigured) {
    return <Navigate to="/config" replace />;
  }

  return <Outlet />;
}
