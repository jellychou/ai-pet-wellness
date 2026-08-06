import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Camera, ChevronDown, ChevronLeft, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useEffect } from "react";
import { apiFetch } from "../lib/api";
import type { AuthUser } from "../store/useAuthStore";
import defaultAvatarPhoto from "../assets/images/default-avatar.png";
import { useAlert } from "../hooks/useAlert";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { ImageCropModal } from "../components/ImageCropModal";

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

export function SettingsEditDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.settingsEditOpen);
  const setOpen = useAppStore((s) => s.setSettingsEditOpen);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [slogan, setSlogan] = useState("");
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const userInfo = useAuthStore((s) => s.userInfo);
  const setUserInfo = useAuthStore((s) => s.setUserInfo);
  const { showSuccess, showError } = useAlert();
  // 選好照片先不急著上傳，開一個裁切畫面讓使用者調整成正方形頭像——
  // pendingAvatarFile 留著原始檔案，讓「使用原圖」可以跳過裁切直接上傳。
  // 注意：這裡的 avatarCropSrc 是 URL.createObjectURL 產生的本地預覽網址，
  // 只是給裁切畫面暫時顯示用，不會被存進資料庫（那是下面 avatarPhoto 存的
  // Cloudinary 網址才會存），跟上面舊註解說明的「不用 blob: URL」不衝突
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

  // 不用 URL.createObjectURL 當「最終存進資料庫」的網址：那個 blob: URL
  // 只在當下這個分頁有效，重新整理頁面、存到後端再讀回來、或換一台裝置都
  // 會失效變成無法顯示的圖片。也不用讀成 base64 直接存進 DB：那樣每次抓
  // 使用者資料都要整包圖片一起傳輸，很快就把 Neon 免費方案的 network
  // transfer 額度用完。改成上傳到 Cloudinary，存的是它回傳的網址，只是
  // 一段字串。
  async function uploadAvatarFile(file: File) {
    setIsUploadingAvatar(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setAvatarPhoto(url);
    } catch (error) {
      console.error(error);
      showError(t("settings.avatarUploadFailed"));
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
  }

  async function getUserInfo() {
    await apiFetch<AuthUser>("/user/user-info", {
      method: "GET",
    })
      .then((user) => {
        setUserInfo(user);
      })
      .catch((err) => {
        console.error("取得使用者資料失敗", err);
      });
  }

  async function handleSave() {
    try {
      await apiFetch<{ message: string }>("/user/update-user-info", {
        method: "PUT",
        body: JSON.stringify({
          name,
          phone,
          birthday,
          gender,
          email,
          slogan,
          picture_url: avatarPhoto,
        }),
      });
      showSuccess(t("settings.updateSuccess"));
      handleBack();
      getUserInfo();
    } catch (err) {
      console.error("更新使用者資料失敗", err);
      showError(err instanceof Error ? err.message : t("settings.updateFailed"));
    }
  }

  // 每次打開這個 drawer 時，把 input 的本地 state 用最新的 userInfo 重新初始化，
  // 這樣打開時看到的是目前的資料，且 input 是可以正常輸入的「受控元件」
  useEffect(() => {
    if (!open) return;
    setAvatarPhoto(userInfo?.picture_url ?? defaultAvatarPhoto);
    setName(userInfo?.name ?? "");
    setPhone(userInfo?.phone ?? "");
    setBirthday(userInfo?.birthday ?? "");
    setGender(userInfo?.gender ?? "");
    setEmail(userInfo?.email ?? "");
    setSlogan(userInfo?.slogan ?? "");
  }, [open, userInfo]);

  const inputClass =
    "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none";

  const inputWrapClass =
    "flex items-center rounded-2xl border border-[#ece0d2] bg-white px-4 py-3";

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
          aria-label={t("common.backAria")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">
          {t("settings.editHeaderTitle")}
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
        <div className="mx-auto max-w-md space-y-5">
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
                src={avatarPhoto ?? ""}
                alt={t("settings.userAvatarAlt")}
                className="h-28 w-28 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={t("settings.changeAvatarAria")}
                className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-[#f0c9a0] text-white shadow-sm transition hover:bg-[#e8bb85] disabled:opacity-60"
              >
                <Camera size={14} />
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
            <SectionHeader icon={User} title={t("settings.sectionBasicInfo")} />

            <Field label={t("settings.fieldName")} required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label={t("settings.fieldPhone")} required>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label={t("settings.fieldBirthday")} required>
              <div className={inputWrapClass}>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={`${inputClass} [color-scheme:light]`}
                />
              </div>
            </Field>

            <Field label={t("settings.fieldGender")}>
              <ToggleGroup
                value={gender}
                onChange={setGender}
                options={[
                  { label: t("settings.genderFemale"), icon: "♀", value: "female" },
                  { label: t("settings.genderMale"), icon: "♂", value: "male" },
                ]}
              />
            </Field>

            <Field label={t("settings.fieldEmail")}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                disabled={true}
              />
            </Field>

            <Field label={t("settings.fieldSlogan")}>
              <input
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* <div className="space-y-3">
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
          </div> */}

          {/* <div className="space-y-3">
            <SectionHeader icon={Lock} title="密碼設定" />

            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-[#ece0d2] bg-white px-3 py-3 text-left transition hover:bg-[#fbf7f1]"
            >
              <span className="text-[12px] font-medium text-ink">變更密碼</span>
              <ChevronRight size={15} className="text-ink/30" />
            </button>
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-[#ece0d2] bg-white px-3 py-3 text-left transition hover:bg-[#fbf7f1]"
            >
              <span className="text-[12px] font-medium text-ink">設定密碼</span>
              <ChevronRight size={15} className="text-ink/30" />
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
