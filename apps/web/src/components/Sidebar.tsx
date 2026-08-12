import {
  Activity,
  Bell,
  Bone,
  Bot,
  HeartPulse,
  Home,
  PawPrint,
  Settings,
  History,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { useAppStore } from "../store/useAppStore";

const links = [
  ["/", Home, "home"],
  ["/pets", PawPrint, "pets"],
  ["/food", Bone, "food"],
  ["/health", HeartPulse, "health"],
  ["/ai", Bot, "ai"],
  ["/stats", Activity, "stats"],
  ["/settings", Settings, "settings"],
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  return (
    <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[#e9dfd4] bg-[#fffdfa] px-5 py-6 lg:flex">
      <Logo />
      <nav className="mt-7 space-y-1.5">
        {links.map(([to, Icon, key]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${isActive ? "bg-[#ead4bd] text-ink shadow-sm" : "text-ink/72 hover:bg-[#f6eee6]"}`
            }
          >
            <Icon size={17} strokeWidth={1.8} />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
        {/* 健康時間軸不再是路由頁面，改成跟其他功能一樣點擊開 drawer，
            用 timelineOpen 自己判斷要不要套用跟 NavLink 一樣的 active 樣式 */}
        <button
          type="button"
          onClick={() => setTimelineOpen(true)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${timelineOpen ? "bg-[#ead4bd] text-ink shadow-sm" : "text-ink/72 hover:bg-[#f6eee6]"}`}
        >
          <History size={17} strokeWidth={1.8} />
          {t("nav.timeline")}
        </button>
      </nav>
      <div className="mt-auto space-y-3">
        <LanguageToggle />
        <div className="flex items-center gap-3 rounded-xl border border-[#eee5dc] bg-white p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-cream text-sm">
            👩🏻
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">Jenny 👋</div>
            <div className="truncate text-[10px] text-ink/45">
              jenny@email.com
            </div>
          </div>
          <Bell size={15} />
        </div>
      </div>
    </aside>
  );
}
