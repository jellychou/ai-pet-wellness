import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bone,
  Cat,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Dog,
  Eye,
  EyeOff,
  Fish,
  Heart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import patternBg from "../assets/images/pattern-watermark.svg";
import { passwordRequirements, strengthOf } from "../lib/passwordStrength";
import { apiFetch, ApiError } from "../lib/api";

// strengthOf() 回傳的 label 是純中文字串（"弱"/"中"/"強"），跟共用的
// lib/passwordStrength.ts 綁在一起，這裡不改那個共用檔（避免影響其他還
// 沒改的呼叫端），只用這個小 map 把回傳的 label 轉成 i18n key 再顯示
const STRENGTH_LABEL_KEY: Record<string, string> = {
  弱: "password.strengthWeak",
  中: "password.strengthMedium",
  強: "password.strengthStrong",
};

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = strengthOf(password);

  function handleBack() {
    navigate("/login");
  }

  async function handleSubmit() {
    setError("");

    if (!password || !confirmPassword) {
      setError(t("resetPassword.fieldsRequiredError"));
      return;
    }
    if (password.length < 8) {
      setError(t("resetPassword.passwordTooShortError"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("resetPassword.passwordMismatchError"));
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f7f1e8]"
      style={{
        backgroundImage: `url(${patternBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm flex-col px-5 py-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("resetPassword.backAria")}
          className="grid h-9 w-9 place-items-center rounded-full text-ink/60 transition hover:bg-white/60"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="mt-2 flex items-center justify-center gap-3 text-center">
          <Heart size={18} className="fill-[#e8b9a8] text-[#e8b9a8]" />
          <h2 className="text-xl font-bold text-ink">
            {t("resetPassword.title")}
          </h2>
          <Heart size={18} className="fill-[#a9c2da] text-[#a9c2da]" />
        </div>
        <p className="mt-1 text-center text-sm text-ink/60">
          {t("resetPassword.subtitle")}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              {t("password.newLabel")}
            </label>
            <div className="flex items-center rounded-2xl border border-[#ece0d2] bg-[#fffdfa]/90 px-3 py-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("resetPassword.newPasswordPlaceholder")}
                autoComplete="new-password"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={t("password.toggleVisibilityAria")}
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              {t("password.confirmLabel")}
            </label>
            <div className="flex items-center rounded-2xl border border-[#ece0d2] bg-[#fffdfa]/90 px-3 py-3">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("password.confirmPlaceholder")}
                autoComplete="new-password"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={t("password.toggleVisibilityAria")}
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-sm text-ink/70">
              {t("password.strengthLabel")}
              {password && (
                <span
                  className="font-semibold"
                  style={{ color: strength.color }}
                >
                  {" "}
                  {t(
                    STRENGTH_LABEL_KEY[strength.label] ??
                      "password.strengthWeak",
                  )}
                </span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#ece4dc]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${strength.ratio * 100}%`,
                  backgroundColor: strength.color,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#ece0d2] bg-[#fbf8f4] p-4">
            <div className="mb-2 text-sm text-ink/70">
              {t("resetPassword.requirementsTitle")}
            </div>
            <div className="space-y-2">
              {passwordRequirements.map((r) => {
                const passed = r.test(password);
                return (
                  <div key={r.key} className="flex items-center gap-2">
                    {passed ? (
                      <CheckCircle2
                        size={15}
                        className="shrink-0 text-[#3fa876]"
                      />
                    ) : (
                      <Circle size={15} className="shrink-0 text-ink/25" />
                    )}
                    <span
                      className={`text-[12px] ${
                        passed ? "text-ink/80" : "text-ink/50"
                      }`}
                    >
                      {t(`resetPassword.requirement.${r.key}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-center text-xs text-red-500">{error}</p>
        )}

        <div className="relative mt-8 flex flex-1 items-end justify-between px-2 pb-4">
          <Cat size={56} className="text-[#c9a06f]/80" />
          <Fish size={22} className="text-[#a9c2da]" />
          <Bone
            size={20}
            className="absolute left-1/2 top-4 -translate-x-1/2 text-[#c9a06f]/50"
          />
          <Dog size={64} className="text-[#c9a06f]" />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-[#caa06f] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:opacity-60"
        >
          {loading ? t("resetPassword.updating") : t("resetPassword.submit")}
        </button>
      </div>
    </div>
  );
}
