import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { AICenterPage } from "./pages/AICenterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PetsPage } from "./pages/PetsPage";
import { FoodPage } from "./pages/FoodPage";
import { HealthPage } from "./pages/HealthPage";
import { TimelinePage } from "./pages/TimelinePage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RecordsPage } from "./pages/RecordsPage";
import { useAuthStore, type AuthUser } from "./store/useAuthStore";
import { apiFetch } from "./lib/api";

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

async function getUserInfo() {
  return apiFetch<AuthUser>("/auth/user-info", {
    method: "GET",
  });
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const setUserInfo = useAuthStore((s) => s.setUserInfo);

  useEffect(() => {
    if (token) {
      getUserInfo().then((user) => {
        setUserInfo(user);
      });
    }
  }, [token, setUserInfo]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RedirectIfAuthed>
            <ResetPasswordPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="ai" element={<AICenterPage />} />
        <Route path="pets" element={<PetsPage />} />
        <Route path="food" element={<FoodPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="records" element={<RecordsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
