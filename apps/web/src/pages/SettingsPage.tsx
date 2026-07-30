import { type ElementType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Phone,
  User,
  Mail,
  MessageCircle,
} from "lucide-react";
import MuiTransgenderIcon from "@mui/icons-material/Transgender";
import { useAuthStore } from "../store/useAuthStore";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import defaultAvatarPhoto from "../assets/images/default-avatar.png";

// lucide-react 沒有性別符號類 icon，這裡用 MUI icons 的 Transgender 包一層，
// 讓它符合 Row 元件期待的 size/className 介面，可以跟其他 lucide icon 一樣使用
function Transgender({
  size = 17,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <MuiTransgenderIcon sx={{ fontSize: size }} className={className} />;
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#d9834f]">{title}</div>
        {action}
      </div>
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
  showChevron = true,
}: {
  icon: ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  showChevron?: boolean;
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
      {showChevron && (
        <ChevronRight size={16} className="shrink-0 text-ink/25" />
      )}
    </button>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`relative h-6 w-10 shrink-0 rounded-full transition ${
        checked ? "bg-[#caa06f]" : "bg-[#e5ddd3]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SwitchRow({
  icon: Icon,
  label,
  value,
  checked,
  onChange,
}: {
  icon: ElementType;
  label: string;
  value?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      <Icon size={17} className="shrink-0 text-ink/45" />
      <span className="flex-1 text-sm text-ink">{label}</span>
      {value && <span className="text-sm text-ink/40">{value}</span>}
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const userInfo = useAuthStore((s) => s.userInfo);
  const logout = useAuthStore((s) => s.logout);
  const setUserInfo = useAuthStore((s) => s.setUserInfo);
  const setSettingsEditOpen = useAppStore((s) => s.setSettingsEditOpen);
  const setChangePasswordOpen = useAppStore((s) => s.setChangePasswordOpen);
  const setSetPasswordOpen = useAppStore((s) => s.setSetPasswordOpen);

  const isEnglish = i18n.language === "en";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleToggleLanguage() {
    const nextLanguage = isEnglish ? "zh-TW" : "en";
    // 先切換畫面語言、更新本地 userInfo，讓使用者立刻看到反應，
    // 呼叫後端同步偏好放在背景執行，失敗也不影響當下的使用體驗
    i18n.changeLanguage(nextLanguage);
    if (userInfo) {
      setUserInfo({ ...userInfo, language: nextLanguage });
    }
    apiFetch<{ message: string }>("/user/update-language", {
      method: "PUT",
      body: JSON.stringify({ language: nextLanguage }),
    }).catch((err) => {
      console.error("更新語言失敗", err);
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-left transition hover:bg-cream/50"
      >
        <div className="relative shrink-0">
          <img
            src={userInfo?.picture_url || defaultAvatarPhoto}
            alt="使用者頭像"
            className="h-16 w-16 rounded-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-ink">
            {userInfo?.name ?? ""}
          </div>
          <div className="mt-0.5 text-xs text-ink/50">
            {userInfo?.slogan ?? ""}
          </div>
        </div>
      </button>

      <Section
        title="飼主資訊"
        action={
          <button
            type="button"
            onClick={() => setSettingsEditOpen(true)}
            className="text-sm font-semibold text-[#c9784a] transition hover:text-[#b56a3d]"
          >
            編輯
          </button>
        }
      >
        <Row
          icon={User}
          label="姓名"
          value={userInfo?.name ?? ""}
          showChevron={false}
        />
        <Row
          icon={Phone}
          label="電話"
          value={userInfo?.phone ?? ""}
          showChevron={false}
        />
        <Row
          icon={Calendar}
          label="生日"
          value={userInfo?.birthday ?? ""}
          showChevron={false}
        />
        <Row
          icon={Transgender}
          label="性別"
          value={userInfo?.gender ?? ""}
          showChevron={false}
        />
        <Row
          icon={Mail}
          label="電子郵件"
          value={userInfo?.email ?? ""}
          showChevron={false}
        />
        <Row
          icon={MessageCircle}
          label="標語"
          value={userInfo?.slogan ?? ""}
          showChevron={false}
        />
      </Section>

      <Section title="偏好設定">
        <SwitchRow
          icon={Globe}
          label="語言 / Language"
          value={isEnglish ? "EN" : "繁中"}
          checked={isEnglish}
          onChange={handleToggleLanguage}
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
        {userInfo?.login_method === "google" ? (
          <Row
            icon={Lock}
            label="設定密碼"
            onClick={() => setSetPasswordOpen(true)}
          />
        ) : (
          <Row
            icon={Lock}
            label="變更密碼"
            onClick={() => setChangePasswordOpen(true)}
          />
        )}
      </Section>

      <Section title="其他">
        <Row icon={Info} label="關於 Pet Wellness" />
        <Row icon={FileText} label="使用條款" />
        <Row icon={HelpCircle} label="常見問題" />
      </Section>

      <Section title="">
        <Row
          icon={FileText}
          label="版本資訊"
          value="v1.0.0"
          showChevron={false}
        />
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
