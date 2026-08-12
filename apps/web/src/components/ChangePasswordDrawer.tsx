import { useMemo, useState } from "react";
import { Check, ChevronLeft, Eye, EyeOff, Lightbulb, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import { useAlert } from "../hooks/useAlert";

const requirements = [
  { key: "length", test: (v: string) => v.length >= 8 },
  {
    key: "case",
    test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { key: "digit", test: (v: string) => /\d/.test(v) },
  {
    key: "special",
    test: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v),
  },
];

// 密碼強度用色塊+文字顯示，文字要跟著語言切換，所以 label 用 t() 現算，
// 不是 module 常數——跟 requirements 拆開存 key 是同一個理由
function strengthOf(v: string, t: TFunction) {
  const passed = requirements.filter((r) => r.test(v)).length;
  if (!v)
    return { level: 0, label: t("password.strengthWeak"), color: "#d9645a" };
  if (passed <= 1)
    return { level: 1, label: t("password.strengthWeak"), color: "#d9645a" };
  if (passed === 2)
    return { level: 2, label: t("password.strengthMedium"), color: "#d9834f" };
  if (passed === 3)
    return {
      level: 3,
      label: t("password.strengthMediumStrong"),
      color: "#c9a13f",
    };
  return { level: 4, label: t("password.strengthStrong"), color: "#3fa876" };
}

export function ChangePasswordDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.changePasswordOpen);
  const setOpen = useAppStore((s) => s.setChangePasswordOpen);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { showSuccess, showError } = useAlert();

  const strength = useMemo(() => strengthOf(newPassword, t), [newPassword, t]);

  function handleBack() {
    setOpen(false);
  }

  async function handleConfirm() {
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      showSuccess(t("password.changeSuccess"));
      handleBack();
    } catch (error) {
      console.error(error);
      showError(
        error instanceof Error ? error.message : t("password.changeFailed"),
      );
    }
  }

  const inputWrapClass =
    "flex items-center rounded-2xl border border-[#ece0d2] bg-white px-3 py-3";
  const inputClass =
    "flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30";

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("common.backAria")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">
          {t("password.changeHeaderTitle")}
        </h1>
        <span className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mx-auto max-w-md space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[#fbe9d9] text-[#c9784a]">
                <Lock size={26} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#3fa876] text-white shadow-sm">
                <Check size={13} />
              </span>
            </div>
            <h2 className="mt-3 text-base font-bold text-ink">
              {t("password.protectTitle")}
            </h2>
            <p className="mt-1 text-[12px] text-ink/50">
              {t("password.protectSubtitle")}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              {t("password.currentLabel")}{" "}
              <span className="text-red-400">*</span>
            </label>
            <div className={inputWrapClass}>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("password.currentPlaceholder")}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={t("password.toggleVisibilityAria")}
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showCurrent ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              {t("password.newLabel")} <span className="text-red-400">*</span>
            </label>
            <div className={inputWrapClass}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("password.newPlaceholder")}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={t("password.toggleVisibilityAria")}
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showNew ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              {t("password.confirmLabel")}{" "}
              <span className="text-red-400">*</span>
            </label>
            <div className={inputWrapClass}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("password.confirmPlaceholder")}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={t("password.toggleVisibilityAria")}
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showConfirm ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-sm text-ink/70">
              {t("password.strengthLabel")}
              <span className="font-semibold" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((seg) => (
                <span
                  key={seg}
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      seg <= strength.level ? strength.color : "#ece4dc",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#fbf1e6] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
              <Lightbulb size={13} />
              {t("password.tipTitle")}
            </div>
            <p className="text-[12px] leading-5 text-ink/60">
              {t("password.tipText")}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full rounded-full bg-[#d99368] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(217,147,104,.35)] transition hover:bg-[#c98457]"
            >
              {t("password.confirmChangeButton")}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="w-full rounded-full border border-[#e8c9a3] py-2.5 text-sm font-semibold text-[#c9784a] transition hover:bg-[#fbe9d9]/40"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
