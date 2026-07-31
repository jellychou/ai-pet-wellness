import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { AICenterPage } from "./pages/AICenterPage";
import { AddPetPage } from "./pages/AddPetPage";
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
  // 注意：zustand persist 不會另外存一個叫 "token" 的 localStorage key，
  // 它把整個 store 包成一份 JSON 放在 "auth-storage" 這個 key 裡，
  // 所以 localStorage.getItem("token") 永遠是 null、永遠判斷成沒登入。
  // 要拿 token 一定要透過 useAuthStore 這個 hook，不能直接讀 localStorage。
  const isAuthenticated = useAuthStore((s) => !!s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  // reload 網頁的當下，localStorage 還沒讀完之前先什麼都不畫，
  // 避免用初始值 isAuthenticated=false 誤判成「沒登入」而先跳一次 /login
  if (!hasHydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  if (!hasHydrated) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

async function getUserInfo() {
  return apiFetch<AuthUser>("/user/user-info", {
    method: "GET",
  });
}

export default function App() {
  // 同樣不能直接讀 localStorage.getItem("token")：這個 key 不存在，
  // 一定要透過 useAuthStore 讀 zustand persist 出來的 token
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
        path="/add-pet"
        element={
          <RequireAuth>
            <AddPetPage />
          </RequireAuth>
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
