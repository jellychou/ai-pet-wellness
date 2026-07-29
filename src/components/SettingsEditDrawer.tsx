import { useState, type ReactNode } from "react";
import {
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const avatarPhoto =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop";

const themeColors = ["#caa06f", "#6fa87e", "#b39ddb", "#6fa8dc"];

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof User;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
      <Icon size={13} />
      {title}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-ink/70">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
      />
    </div>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.label)}
          className={`rounded-xl border py-2 text-[11px] font-medium transition ${
            value === o.label
              ? "border-[#f0c9a0] bg-[#fbe9d9] text-[#c9784a]"
              : "border-[#ece4dc] bg-[#f7f4f0] text-ink/45"
          }`}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
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

export function SettingsEditDrawer() {
  const open = useAppStore((s) => s.settingsEditOpen);
  const setOpen = useAppStore((s) => s.setSettingsEditOpen);
  const setChangePasswordOpen = useAppStore((s) => s.setChangePasswordOpen);

  const [name, setName] = useState("Jenny 周");
  const [phone, setPhone] = useState("0912-345-678");
  const [birthday, setBirthday] = useState("1993 / 02 / 24");
  const [gender, setGender] = useState("女性");
  const [email, setEmail] = useState("jenny.chou@email.com");
  const [language, setLanguage] = useState("繁體中文");
  const [themeColor, setThemeColor] = useState(themeColors[0]);
  const [darkMode, setDarkMode] = useState(false);
  const [notifyHealth, setNotifyHealth] = useState(true);
  const [notifyVaccine, setNotifyVaccine] = useState(true);
  const [notifyFood, setNotifyFood] = useState(false);
  const [notifyAi, setNotifyAi] = useState(true);

  function handleBack() {
    setOpen(false);
  }

  function handleSave() {
    handleBack();
  }

  const inputClass =
    "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none";

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">編輯個人資料</h1>
        <button
          type="button"
          onClick={handleSave}
          className="text-xs font-semibold text-[#c9784a] transition hover:text-[#b56a3d]"
        >
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-5">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={avatarPhoto}
                alt="使用者頭像"
                className="h-28 w-28 rounded-full object-cover"
              />
              <span className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm">
                <Camera size={14} />
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeader icon={User} title="基本資料" />

            <Field label="姓名" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="電話" required>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="生日" required>
              <div className="relative">
                <input
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={`${inputClass} pr-9`}
                />
                <Calendar
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                />
              </div>
            </Field>

            <Field label="性別">
              <ToggleGroup
                value={gender}
                onChange={setGender}
                options={[
                  { label: "生理女", icon: "♀" },
                  { label: "生理男", icon: "♂" },
                ]}
              />
            </Field>

            <Field label="Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <SectionHeader icon={SlidersHorizontal} title="偏好設定" />

            <Field label="語言 / Language">
              <Select
                value={language}
                onChange={setLanguage}
                options={["繁體中文", "English", "日本語"]}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <SectionHeader icon={Bell} title="通知設定" />

            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink/70">
                健康提醒通知
              </span>
              <Switch
                checked={notifyHealth}
                onChange={() => setNotifyHealth((v) => !v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink/70">
                疫苗到期提醒
              </span>
              <Switch
                checked={notifyVaccine}
                onChange={() => setNotifyVaccine((v) => !v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink/70">
                AI 導師回覆通知
              </span>
              <Switch
                checked={notifyAi}
                onChange={() => setNotifyAi((v) => !v)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeader icon={Lock} title="密碼設定" />

            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-[#ece0d2] bg-white px-3 py-3 text-left transition hover:bg-[#fbf7f1]"
            >
              <span className="text-[12px] font-medium text-ink">變更密碼</span>
              <ChevronRight size={15} className="text-ink/30" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
