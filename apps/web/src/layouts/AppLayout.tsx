import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "../components/Sidebar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { AddFoodDrawer } from "../components/AddFoodDrawer";
import { AddVaccineDrawer } from "../components/AddVaccineDrawer";
import { AddVaccineFormDrawer } from "../components/AddVaccineFormDrawer";
import { AddPendingVaccineDrawer } from "../components/AddPendingVaccineDrawer";
import { EditHealthDrawer } from "../components/EditHealthDrawer";
import { HealthDetailDrawer } from "../components/HealthDetailDrawer";
import { EditPetDrawer } from "../components/EditPetDrawer";
import { AddPetDrawer } from "../components/AddPetDrawer";
import { AddHealthRecordDrawer } from "../components/AddHealthRecordDrawer";
import { SettingsEditDrawer } from "../components/SettingsEditDrawer";
import { ChangePasswordDrawer } from "../components/ChangePasswordDrawer";
import { SetPasswordDrawer } from "../components/SetPasswordDrawer";

const pageTitleKeys: Record<string, string> = {
  "/": "home",
  "/pets": "pets",
  "/food": "food",
  "/health": "health",
  "/ai": "ai",
  "/timeline": "timeline",
  "/stats": "stats",
  "/settings": "settings",
  "/records": "records",
  "/ai-scan": "aiScan",
  "/ai-scan/history": "aiScan",
};

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = pageTitleKeys[location.pathname] ?? "home";

  return (
    <div className="min-h-dvh bg-[#f7f5f2] lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa]/90 px-4 py-3 backdrop-blur lg:hidden">
          <h1 className="text-lg font-semibold text-ink">
            {t(`nav.${titleKey}`)}
          </h1>
        </header>
        <main className="p-3 pb-20 sm:p-4 sm:pb-20 lg:pb-5 xl:p-5">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <AddFoodDrawer />
      <AddVaccineDrawer />
      <AddVaccineFormDrawer />
      <AddPendingVaccineDrawer />
      <EditHealthDrawer />
      <HealthDetailDrawer />
      <EditPetDrawer />
      <AddPetDrawer />
      <AddHealthRecordDrawer />
      <SettingsEditDrawer />
      <ChangePasswordDrawer />
      <SetPasswordDrawer />
    </div>
  );
}
