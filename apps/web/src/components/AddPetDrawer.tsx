import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Calendar,
  Camera,
  ChevronDown,
  ChevronLeft,
  FileText,
  Heart,
  Lightbulb,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

const tips = [
  "請確保資訊正確，有助於提供更精準的建議",
  "生日與體重將用於健康與飲食建議",
  "您可以隨時到「我的寵物」更新寵物資訊",
];

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

const initialState = {
  name: "",
  breed: "",
  gender: "Female",
  birthday: "",
  weight: "",
  coatColor: "",
  neutered: "已絕育",
  allergy: "無",
  activity: "中等",
  chipNumber: "",
  note: "",
};

export function AddPetDrawer() {
  const open = useAppStore((s) => s.addPetOpen);
  const setOpen = useAppStore((s) => s.setAddPetOpen);
  const setHasPet = useAuthStore((s) => s.setHasPet);

  const [name, setName] = useState(initialState.name);
  const [breed, setBreed] = useState(initialState.breed);
  const [gender, setGender] = useState(initialState.gender);
  const [birthday, setBirthday] = useState(initialState.birthday);
  const [weight, setWeight] = useState(initialState.weight);
  const [coatColor, setCoatColor] = useState(initialState.coatColor);
  const [neutered, setNeutered] = useState(initialState.neutered);
  const [allergy, setAllergy] = useState(initialState.allergy);
  const [activity, setActivity] = useState(initialState.activity);
  const [chipNumber, setChipNumber] = useState(initialState.chipNumber);
  const [note, setNote] = useState(initialState.note);
  const [avatarSrc, setAvatarSrc] = useState(defaultPetPhoto);
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName(initialState.name);
    setBreed(initialState.breed);
    setGender(initialState.gender);
    setBirthday(initialState.birthday);
    setWeight(initialState.weight);
    setCoatColor(initialState.coatColor);
    setNeutered(initialState.neutered);
    setAllergy(initialState.allergy);
    setActivity(initialState.activity);
    setChipNumber(initialState.chipNumber);
    setNote(initialState.note);
    setAvatarSrc(defaultPetPhoto);
    setError("");
  }

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  function handleBack() {
    resetForm();
    setOpen(false);
  }

  function handleSave() {
    if (!name || !breed || !gender || !birthday || !weight || !coatColor) {
      setError("請完整填寫所有必填欄位");
      return;
    }
    setError("");
    // TODO: 目前後端還沒有寵物 API，這裡先只用本地旗標記錄「已新增寵物」，
    // 之後接上真的 /pets API 後，這裡要改成實際呼叫後端建立寵物資料
    setHasPet(true);
    resetForm();
    setOpen(false);
  }

  const inputClass =
    "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
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
        <h1 className="text-sm font-semibold text-ink">新增寵物</h1>
        <button
          type="button"
          onClick={handleSave}
          className="text-xs font-semibold text-[#c9784a] transition hover:text-[#b56a3d]"
        >
          新增
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex flex-col items-center">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
            <div className="relative">
              <img
                src={avatarSrc}
                alt="寵物頭像"
                className="h-20 w-20 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="更換頭像"
                className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm transition hover:bg-[#e8bb85]"
              >
                <Camera size={12} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="mt-3 flex items-center gap-1 rounded-full bg-[#fbe9d9] px-3 py-1.5 text-[12px] font-medium text-[#c9784a] transition hover:bg-[#f6ddc2]"
            >
              <Camera size={11} />
              上傳照片
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <PawPrint size={13} />
              基本資訊
            </div>

            <Field label="名字" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入寵物名字"
                className={inputClass}
              />
            </Field>

            <Field label="品種" required>
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="請輸入寵物品種"
                className={inputClass}
              />
            </Field>

            <Field label="性別" required>
              <ToggleGroup
                value={gender}
                onChange={setGender}
                options={[
                  { label: "Female", icon: "♀" },
                  { label: "Male", icon: "♂" },
                ]}
              />
            </Field>

            <Field label="生日" required>
              <div className="relative">
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={`${inputClass} pr-9 [color-scheme:light]`}
                />
                <Calendar
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                />
              </div>
            </Field>

            <Field label="體重" required>
              <div className="relative">
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  placeholder="請輸入體重"
                  className={`${inputClass} pr-9`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink/40">
                  kg
                </span>
              </div>
            </Field>

            <Field label="毛色" required>
              <input
                value={coatColor}
                onChange={(e) => setCoatColor(e.target.value)}
                placeholder="請輸入寵物毛色"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <Heart size={13} />
              健康資訊
            </div>

            <Field label="絕育狀態">
              <ToggleGroup
                value={neutered}
                onChange={setNeutered}
                options={[{ label: "已絕育" }, { label: "未絕育" }]}
              />
            </Field>

            <Field label="過敏">
              <input
                value={allergy}
                onChange={(e) => setAllergy(e.target.value)}
                placeholder="請輸入寵物過敏"
                className={inputClass}
              />
            </Field>

            <Field label="活動量">
              <Select
                value={activity}
                onChange={setActivity}
                options={[
                  "低(很少，偶而散步)",
                  "中等(偶爾跑跳)",
                  "高(經常運動)",
                ]}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <FileText size={13} />
              其他資訊
            </div>

            <Field label="晶片號碼">
              <input
                value={chipNumber}
                onChange={(e) => setChipNumber(e.target.value)}
                placeholder="請輸入晶片號碼（選填）"
                className={inputClass}
              />
            </Field>

            <Field label="備註">
              <div className="relative">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 100))}
                  placeholder="請輸入備註（選填）"
                  rows={3}
                  maxLength={100}
                  className={`${inputClass} resize-none placeholder:text-ink/30`}
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-ink/35">
                  {note.length}/100
                </span>
              </div>
            </Field>
          </div>

          <div className="rounded-xl bg-[#fbf1e6] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <Lightbulb size={13} />
              小提醒
            </div>
            <div className="space-y-2">
              {tips.map((tip) => (
                <div key={tip} className="flex items-start gap-1.5">
                  <ShieldCheck
                    size={12}
                    className="mt-0.5 shrink-0 text-[#5ea88f]"
                  />
                  <span className="text-[12px] leading-4 text-ink/70">
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-center text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
