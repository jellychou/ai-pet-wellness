import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAppStore } from "../store/useAppStore";
import { AddFoodDrawer } from "../components/AddFoodDrawer";
import { AddVaccineDrawer } from "../components/AddVaccineDrawer";
import { AiScanDrawer } from "../components/AiScanDrawer";
import { EditHealthDrawer } from "../components/EditHealthDrawer";
import { HealthDetailDrawer } from "../components/HealthDetailDrawer";
import { EditPetDrawer } from "../components/EditPetDrawer";
import { AddHealthRecordDrawer } from "../components/AddHealthRecordDrawer";
import { SettingsEditDrawer } from "../components/SettingsEditDrawer";
import { ChangePasswordDrawer } from "../components/ChangePasswordDrawer";

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
};

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = pageTitleKeys[location.pathname] ?? "home";
  const setSettingsEditOpen = useAppStore((s) => s.setSettingsEditOpen);

  return (
    <div className="min-h-dvh bg-[#f7f5f2] lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa]/90 px-4 py-3 backdrop-blur lg:hidden">
          <h1 className="text-lg font-semibold text-ink">
            {t(`nav.${titleKey}`)}
          </h1>
          {location.pathname === "/settings" && (
            <button
              type="button"
              onClick={() => setSettingsEditOpen(true)}
              aria-label="設定"
              className="grid h-8 w-8 place-items-center rounded-full bg-[#fbe9d9] text-[#c9784a] transition hover:bg-[#f6ddc2]"
            >
              <SettingsIcon size={20} />
            </button>
          )}
        </header>
        <main className="p-3 pb-18 sm:p-4 sm:pb-24 lg:pb-5 xl:p-5">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <AddFoodDrawer />
      <AddVaccineDrawer />
      <AiScanDrawer />
      <EditHealthDrawer />
      <HealthDetailDrawer />
      <EditPetDrawer />
      <AddHealthRecordDrawer />
      <SettingsEditDrawer />
      <ChangePasswordDrawer />
    </div>
  );
}
