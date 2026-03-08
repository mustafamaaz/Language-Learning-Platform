import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const path = location.pathname;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          PolyGlot Dynamic
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Language Learning Platform
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
          <Button
            size="sm"
            variant={path === "/" ? "default" : "ghost"}
            onClick={() => navigate("/")}
          >
            Home
          </Button>
          <Button
            size="sm"
            variant={path === "/settings" ? "default" : "ghost"}
            onClick={() => navigate("/settings")}
          >
            Settings
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant={path === "/playground" ? "default" : "ghost"}
              onClick={() => navigate("/playground")}
            >
              Playground
            </Button>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full border border-slate-200"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {user.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
