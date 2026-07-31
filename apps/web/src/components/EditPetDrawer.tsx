import {
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  useEffect,
} from "react";
import {
  Calendar,
  Camera,
  ChevronDown,
  ChevronLeft,
  FileText,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { apiFetch } from "../lib/api";
import { Pet } from "../data/pets";
import { useAlert } from "../hooks/useAlert";
import { usePetStore } from "../store/usePetStore";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

const tips = [
  "請確保資訊正確，有助於提供更精準的建議",
  "生日與體重將用於健康與飲食建議",
  "您可以隨時更新寵物資訊",
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

export function EditPetDrawer() {
  const open = useAppStore((s) => s.editPetOpen);
  const setOpen = useAppStore((s) => s.setEditPetOpen);
  const navigate = useNavigate();
  const setSelectedPet = usePetStore((s) => s.setSelectedPet);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [weight, setWeight] = useState(0);
  const [coatColor, setCoatColor] = useState("");
  const [neutered, setNeutered] = useState("");
  const [allergy, setAllergy] = useState("");
  const [activity, setActivity] = useState("中");
  const [chipNumber, setChipNumber] = useState("");
  const [note, setNote] = useState("");
  const [avatarSrc, setAvatarSrc] = useState(defaultPetPhoto);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const userInfo = useAuthStore((s) => s.userInfo);
  const [pet, setPet] = useState<Pet | null>(null);
  const { showSuccess, showError } = useAlert();

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleBack() {
    setOpen(false);
    navigate("/pets");
  }

  async function handleSave() {
    try {
      console.log(avatarSrc);
      await apiFetch<Pet>("/pet/update-pet", {
        method: "PUT",
        body: JSON.stringify({
          id: userInfo?.active_pet_id,
          name: name,
          breed: breed,
          gender: gender,
          birthday: birthday,
          weight: weight,
          coatColor: coatColor,
          neutered: neutered,
          allergy: allergy,
          activity: activity,
          chipNumber: chipNumber,
          note: note,
          avatar: avatarSrc,
        }),
      });
      showSuccess("寵物資訊已更新");
      fetchPet();
      setOpen(false);
    } catch (error) {
      console.error(error);
      showError("寵物資訊更新失敗");
    }
  }

  const fetchPet = async () => {
    if (!open) return;
    const response = await apiFetch<Pet>(
      `/pet/get-pet/${userInfo?.active_pet_id}`,
    );
    setPet(response);
    setSelectedPet(response);
    setName(response?.name ?? "");
    setBreed(response?.breed ?? "");
    setGender(response?.gender ?? "");
    setBirthday(response?.birthday ?? "");
    setWeight(response?.weight ?? 0);
    setCoatColor(response?.coatColor ?? "");
    setNeutered(response?.neutered ?? "");
    setAllergy(response?.allergy ?? "");
    setActivity(response?.activity ?? "");
    setChipNumber(response?.chipNumber ?? "");
    setNote(response?.note ?? "");
    setAvatarSrc(response?.avatar ?? defaultPetPhoto);
  };

  useEffect(() => {
    fetchPet();
  }, [userInfo, open]);

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
          aria-label="返回首頁"
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">編輯寵物資訊</h1>
        <button
          type="button"
          onClick={handleSave}
          className="text-xs font-semibold text-[#c9784a] transition hover:text-[#b56a3d]"
        >
          儲存
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
                className={inputClass}
              />
            </Field>

            <Field label="品種" required>
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
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

            <Field label="體重" required>
              <div className="relative">
                <input
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value) ?? 0)}
                  inputMode="decimal"
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
              <Select
                value={allergy}
                onChange={setAllergy}
                options={["雞肉、牛肉", "無", "海鮮", "穀物"]}
              />
            </Field>

            <Field label="活動量">
              <Select
                value={activity}
                onChange={setActivity}
                options={["低", "中等", "高"]}
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
        </div>
      </div>
    </div>
  );
}
