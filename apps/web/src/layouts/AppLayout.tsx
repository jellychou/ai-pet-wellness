import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { useAppStore } from "../store/useAppStore";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { AddFoodDrawer } from "../components/AddFoodDrawer";
import { FoodScanHistoryDrawer } from "../components/FoodScanHistoryDrawer";
import { AddVaccineDrawer } from "../components/AddVaccineDrawer";
import { AddVaccineFormDrawer } from "../components/AddVaccineFormDrawer";
import { AddPendingVaccineDrawer } from "../components/AddPendingVaccineDrawer";
import { AiScanDrawer } from "../components/AiScanDrawer";
import { AiScanHistoryDrawer } from "../components/AiScanHistoryDrawer";
import { HealthJournalDrawer } from "../components/HealthJournalDrawer";
import { HealthJournalHistoryDrawer } from "../components/HealthJournalHistoryDrawer";
import { EditHealthDrawer } from "../components/EditHealthDrawer";
import { HealthDetailDrawer } from "../components/HealthDetailDrawer";
import { EditPetDrawer } from "../components/EditPetDrawer";
import { AddPetDrawer } from "../components/AddPetDrawer";
import { AddHealthRecordDrawer } from "../components/AddHealthRecordDrawer";
import { SettingsEditDrawer } from "../components/SettingsEditDrawer";
import { ChangePasswordDrawer } from "../components/ChangePasswordDrawer";
import { SetPasswordDrawer } from "../components/SetPasswordDrawer";
import { SettingsInfoDrawer } from "../components/SettingsInfoDrawer";
import { WaterIntakeDrawer } from "../components/WaterIntakeDrawer";
import { MentorHistoryDrawer } from "../components/MentorHistoryDrawer";
import { MentorHistoryDetailDrawer } from "../components/MentorHistoryDetailDrawer";
import { TimelineDrawer } from "../pages/TimelinePage";

const pageTitleKeys: Record<string, string> = {
  "/": "home",
  "/pets": "pets",
  "/food": "food",
  "/health": "health",
  "/ai": "ai",
  "/stats": "stats",
  "/settings": "settings",
  "/records": "records",
};

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = pageTitleKeys[location.pathname] ?? "home";
  const setMentorHistoryOpen = useAppStore((s) => s.setMentorHistoryOpen);
  const isMentorPage = location.pathname === "/ai";

  return (
    <div className="min-h-dvh bg-[#f7f5f2] lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa]/90 px-4 py-3 backdrop-blur lg:hidden">
          <span className="flex items-center gap-1.5">
            <h1 className="text-lg font-semibold text-ink">
              {t(`nav.${titleKey}`)}
            </h1>
          </span>
          {isMentorPage && (
            <button
              type="button"
              onClick={() => setMentorHistoryOpen(true)}
              aria-label={t("mentor.historyAria")}
              className="grid h-7 w-7 place-items-center rounded-full text-ink/50 transition hover:bg-cream"
            >
              <Clock size={16} />
            </button>
          )}
        </header>
        <main className="p-3 pb-20 sm:p-4 sm:pb-20 lg:pb-5 xl:p-5">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <TimelineDrawer />
      <AddFoodDrawer />
      <FoodScanHistoryDrawer />
      <AddVaccineDrawer />
      <AddVaccineFormDrawer />
      <AddPendingVaccineDrawer />
      <AiScanDrawer />
      <AiScanHistoryDrawer />
      <HealthJournalDrawer />
      <HealthJournalHistoryDrawer />
      <EditHealthDrawer />
      <HealthDetailDrawer />
      <EditPetDrawer />
      <AddPetDrawer />
      <AddHealthRecordDrawer />
      <SettingsEditDrawer />
      <ChangePasswordDrawer />
      <SetPasswordDrawer />
      <SettingsInfoDrawer />
      <WaterIntakeDrawer />
      <MentorHistoryDrawer />
      <MentorHistoryDetailDrawer />
    </div>
  );
}
