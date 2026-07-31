import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Calendar,
  Camera,
  ChevronDown,
  FileText,
  Heart,
  Lightbulb,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

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
  options: { label: string; icon?: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border py-2 text-[11px] font-medium transition ${
            value === o.value
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

export function AddPetPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Female");
  const [birthday, setBirthday] = useState("");
  const [weight, setWeight] = useState("");
  const [coatColor, setCoatColor] = useState("");
  const [neutered, setNeutered] = useState("已絕育");
  const [allergy, setAllergy] = useState("無");
  const [activity, setActivity] = useState("中等");
  const [chipNumber, setChipNumber] = useState("");
  const [note, setNote] = useState("");
  const [avatarSrc, setAvatarSrc] = useState(defaultPetPhoto);
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function handleSubmit() {
    if (!name || !breed || !gender || !birthday || !weight || !coatColor) {
      setError("請完整填寫所有必填欄位");
      return;
    }
    setError("");
    try {
      await apiFetch("/pet/add-pet", {
        method: "POST",
        body: JSON.stringify({
          name,
          breed,
          gender,
          birthday,
          weight,
          coatColor,
          neutered,
          allergy,
          activity,
          chipNumber,
          note,
        }),
      });
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none";

  return (
    <div className="min-h-dvh bg-[#fbf8f4]">
      <div className="sticky top-0 z-10 border-b border-[#ece4dc] bg-[#fffdfa]/90 px-4 py-3 text-center backdrop-blur">
        <h1 className="text-sm font-semibold text-ink">新增寵物</h1>
        <p className="mt-0.5 text-[11px] text-ink/50">
          填寫毛孩的基本資料，開始使用 Pet Wellness
        </p>
      </div>

      <div className="px-4 py-5">
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
                  { label: "女生", icon: "♀", value: "Female" },
                  { label: "男生", icon: "♂", value: "Male" },
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
                options={[
                  { label: "已絕育", value: "1" },
                  { label: "未絕育", value: "0" },
                ]}
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

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
          >
            完成新增
          </button>
        </div>
      </div>
    </div>
  );
}
