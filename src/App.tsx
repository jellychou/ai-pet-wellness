import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AICenterPage } from "./pages/AICenterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PetsPage } from "./pages/PetsPage";
import { FoodPage } from "./pages/FoodPage";
import { HealthPage } from "./pages/HealthPage";
import { TimelinePage } from "./pages/TimelinePage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RecordsPage } from "./pages/RecordsPage";
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
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
