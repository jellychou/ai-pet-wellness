import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Moon,
  Palette,
  Phone,
  ShieldCheck,
  User,
  UserRoundCheck,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const fallbackAvatarPhoto =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop";

const themeColors = ["#caa06f", "#6fa87e", "#b39ddb", "#6fa8dc"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-[#d9834f]">{title}</div>
      <div className="divide-y divide-[#eee5da] overflow-hidden rounded-2xl border border-[#ece0d2] bg-[#fffdfa]">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-cream/50"
    >
      <Icon size={17} className="shrink-0 text-ink/45" />
      <span className="flex-1 text-sm text-ink">{label}</span>
      {value && <span className="text-sm text-ink/40">{value}</span>}
      <ChevronRight size={16} className="shrink-0 text-ink/25" />
    </button>
  );
}

export function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState(themeColors[0]);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userInfo = useAuthStore((s) => s.userInfo);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-left transition hover:bg-cream/50"
      >
        <div className="relative shrink-0">
          <img
            src={userInfo?.picture_url || fallbackAvatarPhoto}
            alt="使用者頭像"
            className="h-16 w-16 rounded-full object-cover"
          />
          <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm">
            <Camera size={12} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-ink">
            {userInfo?.name ?? ""}
          </div>
          <div className="mt-0.5 text-xs text-ink/50">
            {userInfo?.slogan ?? ""}
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink/30" />
      </button>

      <Section title="飼主資訊">
        <Row icon={User} label="姓名" value={userInfo?.name ?? ""} />
        <Row icon={Phone} label="電話" value={userInfo?.phone ?? ""} />
        <Row icon={Calendar} label="生日" value={userInfo?.birthdate ?? ""} />
        <Row icon={Mail} label="電子郵件" value={userInfo?.email ?? ""} />
        <Row icon={MessageCircle} label="標語" value={userInfo?.slogan ?? ""} />
      </Section>

      <Section title="偏好設定">
        <Row
          icon={Globe}
          label="語言 / Language"
          value={userInfo?.language ?? ""}
        />
        {/* <Row icon={Bell} label="通知設定" value="已開啟" /> */}
        {/* <div className="flex items-center gap-3 px-4 py-3.5">
          <Moon size={17} className="shrink-0 text-ink/45" />
          <span className="flex-1 text-sm text-ink">深色模式</span>
          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            aria-pressed={darkMode}
            className={`relative h-6 w-10 shrink-0 rounded-full transition ${
              darkMode ? "bg-[#caa06f]" : "bg-[#e5ddd3]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                darkMode ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div> */}
        {/* <div className="flex items-center gap-3 px-4 py-3.5">
          <Palette size={17} className="shrink-0 text-ink/45" />
          <span className="flex-1 text-sm text-ink">主題顏色</span>
          <div className="flex items-center gap-1.5">
            {themeColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setThemeColor(c)}
                aria-label={`選擇主題顏色 ${c}`}
                className="grid h-5 w-5 place-items-center rounded-full"
                style={{ backgroundColor: c }}
              >
                {themeColor === c && <Check size={11} className="text-white" />}
              </button>
            ))}
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink/25" />
        </div> */}
      </Section>

      <Section title="帳號與安全">
        <Row icon={Lock} label="變更密碼" />
        {/* <Row icon={ShieldCheck} label="隱私設定" /> */}
        {/* <Row icon={UserRoundCheck} label="兩步驟驗證" value="未開啟" /> */}
      </Section>

      <Section title="其他">
        <Row icon={Info} label="關於 Pet Wellness" />
        <Row icon={FileText} label="使用條款" />
        <Row icon={HelpCircle} label="常見問題" />
      </Section>

      <Section title="">
        <Row icon={FileText} label="版本資訊" value="v1.0.0" />
      </Section>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbe4de] py-3.5 text-sm font-semibold text-[#c9503f] transition hover:bg-[#f6d5cd]"
      >
        <LogOut size={16} />
        登出
      </button>
    </div>
  );
}
