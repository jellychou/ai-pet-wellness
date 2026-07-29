import { ScrollText, Bot, Home, PawPrint, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const links = [
  ["/", Home, "home"],
  ["/pets", PawPrint, "pets"],
  ["/ai", Bot, "ai"],
  ["/records", ScrollText, "records"],
  ["/settings", Settings, "settings"],
] as const;

export function MobileBottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ece4dc] bg-[#fffdfa]/95 backdrop-blur lg:hidden">
      <div
        className="mx-auto flex max-w-md items-center justify-between px-2 pt-2"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {links.map(([to, Icon, key]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[10px] transition ${
                isActive ? "text-[#4a90d9]" : "text-ink/45"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className={isActive ? "font-semibold" : ""}>
                  {t(`nav.${key}`)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
