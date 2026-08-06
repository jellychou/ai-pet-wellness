import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  FileText,
  Heart,
  Lightbulb,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { ImageCropModal } from "../components/ImageCropModal";
import { useAlert } from "../hooks/useAlert";
import { usePetStore } from "../store/usePetStore";
import { Pet } from "../data/pets";
import defaultPetAvatar from "../assets/images/default-avatar.png";

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

const initialState = {
  name: "",
  species: "dog",
  breed: "",
  gender: "Female",
  birthday: "",
  weight: "",
  coatColor: "",
  neutered: "0",
  allergy: "無",
  activity: "中等",
  chipNumber: "",
  note: "",
};

export function AddPetDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.addPetOpen);
  const setOpen = useAppStore((s) => s.setAddPetOpen);
  const setAllPetsList = usePetStore((s) => s.setAllPetsList);
  const tips = [t("addPet.tip1"), t("addPet.tip2"), t("addPet.tip3")];

  const [name, setName] = useState(initialState.name);
  const [species, setSpecies] = useState(initialState.species);
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
  const [avatarSrc, setAvatarSrc] = useState(defaultPetAvatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useAlert();
  // 選好照片先不急著上傳，開一個裁切畫面讓使用者調整成正方形頭像——
  // pendingAvatarFile 留著原始檔案，讓「使用原圖」可以跳過裁切直接上傳
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(
    null,
  );

  function resetForm() {
    setName(initialState.name);
    setSpecies(initialState.species);
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
    setAvatarSrc(defaultPetAvatar);
    setIsUploadingAvatar(false);
    setError("");
    if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
    setAvatarCropSrc(null);
    setPendingAvatarFile(null);
  }

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingAvatarFile(file);
    setAvatarCropSrc(URL.createObjectURL(file));
  }

  function closeAvatarCrop() {
    if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
    setAvatarCropSrc(null);
    setPendingAvatarFile(null);
  }

  // 改成上傳到 Cloudinary、存回傳的網址。原本用 URL.createObjectURL 產生的
  // blob: 網址只在當下這個分頁有效，存進資料庫、重新整理頁面或換裝置看都會
  // 直接失效變成無法顯示的圖片，是個沒發現的 bug；Cloudinary 網址才是能長期
  // 使用、也不會佔資料庫傳輸額度的做法
  async function uploadAvatarFile(file: File) {
    setIsUploadingAvatar(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setAvatarSrc(url);
    } catch (error) {
      console.error(error);
      showError(t("addPet.imageUploadFailed"));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function handleAvatarCropConfirm(file: File) {
    closeAvatarCrop();
    uploadAvatarFile(file);
  }

  function handleAvatarUseOriginal() {
    const file = pendingAvatarFile;
    closeAvatarCrop();
    if (file) uploadAvatarFile(file);
  }

  function handleBack() {
    resetForm();
    setOpen(false);
  }

  async function handleSave() {
    if (!name || !breed || !gender || !birthday || !weight || !coatColor) {
      setError(t("addPet.validationRequired"));
      return;
    }
    setError("");
    await apiFetch("/pet/add-pet", {
      method: "POST",
      body: JSON.stringify({
        name,
        species,
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
        avatar: avatarSrc,
      }),
    });
    resetForm();
    fetchAllPetsList();
    setOpen(false);
  }

  function fetchAllPetsList() {
    apiFetch("/pet/get-all-pets", {
      method: "GET",
    }).then((res) => {
      setAllPetsList(res as Pet[]);
    });
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
          aria-label={t("common.backAria")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">
          {t("addPet.headerTitle")}
        </h1>
        <button
          type="button"
          onClick={handleSave}
          className="text-xs font-semibold text-[#c9784a] transition hover:text-[#b56a3d]"
        >
          {t("pets.add")}
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
                alt={t("addPet.petAvatarAlt")}
                className="h-20 w-20 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={t("addPet.changeAvatarAria")}
                className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm transition hover:bg-[#e8bb85] disabled:opacity-60"
              >
                <Camera size={12} />
              </button>
            </div>
          </div>

          <ImageCropModal
            open={!!avatarCropSrc}
            imageSrc={avatarCropSrc}
            aspect={1}
            fileName="avatar.jpg"
            onCancel={closeAvatarCrop}
            onConfirm={handleAvatarCropConfirm}
            onUseOriginal={handleAvatarUseOriginal}
          />

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <PawPrint size={13} />
              {t("addPet.sectionBasic")}
            </div>

            <Field label={t("pets.fieldName")} required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("addPet.fieldNamePlaceholder")}
                className={inputClass}
              />
            </Field>

            <Field label={t("pets.fieldSpecies")} required>
              <ToggleGroup
                value={species}
                onChange={setSpecies}
                options={[
                  { label: t("pets.speciesDog"), icon: "🐶", value: "dog" },
                  { label: t("pets.speciesCat"), icon: "🐱", value: "cat" },
                ]}
              />
            </Field>

            <Field label={t("pets.fieldBreed")} required>
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder={t("addPet.fieldBreedPlaceholder")}
                className={inputClass}
              />
            </Field>

            <Field label={t("pets.fieldGender")} required>
              <ToggleGroup
                value={gender}
                onChange={setGender}
                options={[
                  { label: t("common.female"), icon: "♀", value: "Female" },
                  { label: t("common.male"), icon: "♂", value: "Male" },
                ]}
              />
            </Field>

            <Field label={t("pets.fieldBirthday")} required>
              <div className="relative">
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={`${inputClass} pr-9 [color-scheme:light]`}
                />
              </div>
            </Field>

            <Field label={t("pets.fieldWeight")} required>
              <div className="relative">
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  placeholder={t("addPet.fieldWeightPlaceholder")}
                  className={`${inputClass} pr-9`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink/40">
                  kg
                </span>
              </div>
            </Field>

            <Field label={t("pets.fieldCoatColor")} required>
              <input
                value={coatColor}
                onChange={(e) => setCoatColor(e.target.value)}
                placeholder={t("addPet.fieldCoatColorPlaceholder")}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <Heart size={13} />
              {t("addPet.sectionHealth")}
            </div>

            <Field label={t("pets.fieldNeutered")}>
              <ToggleGroup
                value={neutered}
                onChange={setNeutered}
                options={[
                  { label: t("pets.neuteredYes"), value: "1" },
                  { label: t("pets.neuteredNo"), value: "0" },
                ]}
              />
            </Field>

            <Field label={t("pets.fieldAllergy")}>
              <input
                value={allergy}
                onChange={(e) => setAllergy(e.target.value)}
                placeholder={t("addPet.fieldAllergyPlaceholder")}
                className={inputClass}
              />
            </Field>

            <Field label={t("pets.fieldActivity")}>
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
              {t("addPet.sectionOther")}
            </div>

            <Field label={t("pets.fieldChipNumber")}>
              <input
                value={chipNumber}
                onChange={(e) => setChipNumber(e.target.value)}
                placeholder={t("addPet.fieldChipNumberPlaceholder")}
                className={inputClass}
              />
            </Field>

            <Field label={t("addPet.fieldNote")}>
              <div className="relative">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 100))}
                  placeholder={t("addPet.fieldNotePlaceholder")}
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
              {t("addPet.tipsTitle")}
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
