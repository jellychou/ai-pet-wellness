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
import { useTranslation } from "react-i18next";
import { apiFetch } from "../lib/api";
import { usePetStore } from "../store/usePetStore";
import { Pet } from "../data/pets";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { ImageCropModal } from "../components/ImageCropModal";
import { useAlert } from "../hooks/useAlert";
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

export function AddPetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAllPetsList = usePetStore((s) => s.setAllPetsList);
  const tips = [t("addPet.tip1"), t("addPet.tip2"), t("addPet.tip3")];

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
  const [avatarSrc, setAvatarSrc] = useState(defaultPetAvatar);
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { showError } = useAlert();
  // 選好照片先不急著上傳，開一個裁切畫面讓使用者調整成正方形頭像——
  // pendingAvatarFile 留著原始檔案，讓「使用原圖」可以跳過裁切直接上傳
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(
    null,
  );

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

  async function handleSubmit() {
    if (!name || !breed || !gender || !birthday || !weight || !coatColor) {
      setError(t("addPet.validationRequired"));
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
          avatar: avatarSrc,
        }),
      });
      fetchAllPetsList();
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
    }
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
    <div className="min-h-dvh bg-[#fbf8f4]">
      <div className="sticky top-0 z-10 border-b border-[#ece4dc] bg-[#fffdfa]/90 px-4 py-3 text-center backdrop-blur">
        <h1 className="text-sm font-semibold text-ink">
          {t("addPet.headerTitle")}
        </h1>
        <p className="mt-0.5 text-[11px] text-ink/50">
          {t("addPet.headerSubtitle")}
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
                alt={t("addPet.petAvatarAlt")}
                className="h-20 w-20 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={t("addPet.changeAvatarAria")}
                className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm transition hover:bg-[#e8bb85]"
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

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
          >
            {t("addPet.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
