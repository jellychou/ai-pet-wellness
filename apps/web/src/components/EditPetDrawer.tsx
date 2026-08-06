import {
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  useEffect,
} from "react";
import {
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
import { useTranslation } from "react-i18next";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { apiFetch } from "../lib/api";
import { Pet } from "../data/pets";
import { useAlert } from "../hooks/useAlert";
import { usePetStore } from "../store/usePetStore";
import { AuthUser } from "../store/useAuthStore";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { ImageCropModal } from "../components/ImageCropModal";
import { breedList, allergyList, activityList } from "../data/pets";
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
  options: {
    zh: string;
    en: string;
    group?: string;
    value?: string;
    label?: string;
  }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.zh}
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
  const { t } = useTranslation();
  const tips = [t("addPet.tip1"), t("addPet.tip2"), t("editPet.tip3")];
  const open = useAppStore((s) => s.editPetOpen);
  const setOpen = useAppStore((s) => s.setEditPetOpen);
  const navigate = useNavigate();
  const setSelectedPet = usePetStore((s) => s.setSelectedPet);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const setUserInfo = useAuthStore((s) => s.setUserInfo);
  const setAllPetsList = usePetStore((s) => s.setAllPetsList);
  const allPetsList = usePetStore((s) => s.allPetsList);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
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
  const [avatarSrc, setAvatarSrc] = useState(defaultPetAvatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const userInfo = useAuthStore((s) => s.userInfo);
  const { showSuccess, showError } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
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

  // 改成直接上傳到 Cloudinary，不再讀成 base64 存進資料庫——base64 版本每次
  // 抓寵物資料都要整包圖片一起傳輸，很快就把 Neon 免費方案的 network
  // transfer 額度用完；現在存的是 Cloudinary 回傳的網址，只是一段字串
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
    setOpen(false);
    navigate("/pets");
  }

  async function handleSave() {
    // 後端 UpdatePetRequest 的 birthday/weight 是嚴格的 date/float，空字串
    // 或 NaN 送過去會被 Pydantic 擋成 422，且錯誤訊息對使用者來說完全看不懂
    // 是哪個欄位有問題——送出前先在前端擋掉，訊息才會是使用者看得懂的中文
    if (
      !name.trim() ||
      !breed.trim() ||
      !gender ||
      !birthday ||
      !coatColor.trim()
    ) {
      showError(t("editPet.validationRequired"));
      return;
    }
    if (!weight || Number.isNaN(weight) || weight <= 0) {
      showError(t("editPet.validationWeight"));
      return;
    }

    try {
      await apiFetch<Pet>("/pet/update-pet", {
        method: "PUT",
        body: JSON.stringify({
          id: userInfo?.active_pet_id,
          name: name,
          species: species,
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
      showSuccess(t("editPet.updateSuccess"));
      fetchPet();
      setOpen(false);
    } catch (error) {
      console.error(error);
      showError(t("editPet.updateFailed"));
    }
  }

  const fetchUserInfo = async () => {
    const userInfo = await apiFetch<AuthUser>("/user/user-info", {
      method: "GET",
    });
    setUserInfo(userInfo);
  };

  const fetchAllPetsList = async () => {
    const allPetsList = await apiFetch<Pet[]>("/pet/all-pets", {
      method: "GET",
    });
    setAllPetsList(allPetsList);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiFetch<Pet>(`/pet/delete-pet/${userInfo?.active_pet_id}`, {
        method: "DELETE",
      });
      showSuccess(t("editPet.deleteSuccess"));
      fetchUserInfo();
      fetchAllPetsList();
      setSelectedPet(
        allPetsList.find((pet) => pet.id === userInfo?.active_pet_id) ??
          allPetsList[0] ??
          null,
      );
      fetchPet();
      setConfirmDeleteOpen(false);
      setOpen(false);
    } catch (error) {
      console.error(error);
      showError(t("editPet.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchPet = async () => {
    if (!open) return;
    const response = await apiFetch<Pet>(
      `/pet/get-pet/${userInfo?.active_pet_id}`,
    );
    setSelectedPet(response);
  };

  useEffect(() => {
    setName(selectedPet?.name ?? "");
    setSpecies(selectedPet?.species ?? "dog");
    setBreed(selectedPet?.breed ?? "");
    setGender(selectedPet?.gender ?? "");
    setBirthday(selectedPet?.birthday ?? "");
    setWeight(selectedPet?.weight ?? 0);
    setCoatColor(selectedPet?.coatColor ?? "");
    setNeutered(selectedPet?.neutered ?? "");
    setAllergy(selectedPet?.allergy ?? "");
    setActivity(selectedPet?.activity ?? "");
    setChipNumber(selectedPet?.chipNumber ?? "");
    setNote(selectedPet?.note ?? "");
    setAvatarSrc(selectedPet?.avatar ?? defaultPetAvatar);
    setIsDeleting(
      userInfo?.pets?.length && userInfo?.pets?.length > 1 ? false : true,
    );
  }, [selectedPet]);

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
          aria-label={t("editPet.backHomeAria")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">
          {t("editPet.headerTitle")}
        </h1>
        <button
          type="button"
          onClick={handleSave}
          className="text-xs font-semibold text-[#c9784a] transition hover:text-[#b56a3d]"
        >
          {t("common.save")}
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
              <Select
                value={breed}
                onChange={(value) => setBreed(value)}
                options={breedList}
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
                  onChange={(e) => {
                    // `??` 只擋 null/undefined，擋不住 NaN——輸入到一半是空字串
                    // 或非數字時 Number(...) 會是 NaN，NaN ?? 0 還是 NaN，
                    // 存進 state、送出時 JSON.stringify 會變成 null，後端
                    // UpdatePetRequest.weight 是必填 float，null 就會 422
                    const parsed = Number(e.target.value);
                    setWeight(Number.isNaN(parsed) ? 0 : parsed);
                  }}
                  inputMode="decimal"
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
              <Select
                value={allergy}
                onChange={setAllergy}
                options={allergyList}
              />
            </Field>

            <Field label={t("pets.fieldActivity")}>
              <Select
                value={activity}
                onChange={setActivity}
                options={activityList}
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
          {userInfo?.pets?.length && userInfo?.pets?.length > 1 && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isDeleting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbe4de] py-2 text-sm font-semibold text-[#c9503f] transition hover:bg-[#f6d5cd]"
            >
              {t("editPet.deletePet")}
            </button>
          )}
        </div>
      </div>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !isDeleting && setConfirmDeleteOpen(false)}
        aria-labelledby="delete-pet-title"
      >
        <DialogTitle id="delete-pet-title">
          {t("editPet.deletePet")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t("editPet.deleteDialogText")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={isDeleting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleDelete} color="error" disabled={isDeleting}>
            {isDeleting ? t("editPet.deleting") : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
