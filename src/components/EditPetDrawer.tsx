import { useState, type ReactNode } from "react";
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
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

const petPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

const initialPhotos = [
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=220&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=220&h=200&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=210&h=210&fit=crop",
];

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

export function EditPetDrawer() {
  const open = useAppStore((s) => s.editPetOpen);
  const setOpen = useAppStore((s) => s.setEditPetOpen);
  const navigate = useNavigate();

  const [name, setName] = useState("Coco");
  const [breed, setBreed] = useState("Golden Retriever");
  const [gender, setGender] = useState("Female");
  const [birthday, setBirthday] = useState("2020/06/20（4歲）");
  const [weight, setWeight] = useState("25.4");
  const [coatColor, setCoatColor] = useState("Golden");
  const [neutered, setNeutered] = useState("已絕育");
  const [allergy, setAllergy] = useState("雞肉、牛肉");
  const [activity, setActivity] = useState("中等");
  const [chipNumber, setChipNumber] = useState("900215000123456");
  const [ownerContact, setOwnerContact] = useState("均誼 周");
  const [phone, setPhone] = useState("0912-345-678");
  const [email, setEmail] = useState("junyichou@gmail.com");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState(initialPhotos);

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBack() {
    setOpen(false);
    navigate("/pets");
  }

  function handleSave() {
    handleBack();
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
            <div className="relative">
              <img
                src={petPhoto}
                alt="寵物頭像"
                className="h-20 w-20 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm">
                <Camera size={12} />
              </span>
            </div>
            <button
              type="button"
              className="mt-3 flex items-center gap-1 rounded-full bg-[#fbe9d9] px-3 py-1.5 text-[12px] font-medium text-[#c9784a] transition hover:bg-[#f6ddc2]"
            >
              <Camera size={11} />
              更換頭像
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
                className={inputClass}
              />
            </Field>

            <Field label="品種" required>
              <Select
                value={breed}
                onChange={setBreed}
                options={["Golden Retriever", "Labrador", "Poodle", "Mixed"]}
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
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  className={`${inputClass} pr-9`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink/40">
                  kg
                </span>
              </div>
            </Field>

            <Field label="毛色" required>
              <Select
                value={coatColor}
                onChange={setCoatColor}
                options={["Golden", "Black", "White", "Brown"]}
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

            <Field label="飼主聯絡人">
              <input
                value={ownerContact}
                onChange={(e) => setOwnerContact(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="聯絡電話">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="聯絡 Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <ImageIcon size={13} />
              更多照片
            </div>

            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={src} className="relative aspect-square">
                  <img
                    src={src}
                    alt={`Coco 照片 ${i + 1}`}
                    className="h-full w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="移除照片"
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink/60 shadow-sm transition hover:text-ink"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#e8c9a3] text-[#c9784a] transition hover:bg-[#fbe9d9]/40"
              >
                <Plus size={16} />
                <span className="text-[9px]">新增照片</span>
              </button>
            </div>

            <p className="text-[12px] text-ink/40">
              可上傳更多 Coco 的可愛照片！
            </p>
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
