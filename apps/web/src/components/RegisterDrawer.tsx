import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import patternBg from "../assets/images/pattern-watermark.svg";
import logo from "../assets/images/logo.png";
import { apiFetch, ApiError } from "../lib/api";
import { useAuthStore, type AuthUser } from "../store/useAuthStore";
import { strengthOf } from "../lib/passwordStrength";

// strengthOf() 回傳的 label 是純中文字串（"弱"/"中"/"強"），跟共用的
// lib/passwordStrength.ts 綁在一起，這裡不改那個共用檔（避免影響其他還
// 沒改的呼叫端），只用這個小 map 把回傳的 label 轉成 i18n key 再顯示
const STRENGTH_LABEL_KEY: Record<string, string> = {
  弱: "password.strengthWeak",
  中: "password.strengthMedium",
  強: "password.strengthStrong",
};

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    { n: 1, label: t("register.stepAccount") },
    { n: 2, label: t("register.stepProfile") },
    { n: 3, label: t("register.stepDone") },
  ] as const;
  return (
    <div className="mt-6 flex items-center justify-center">
      {steps.map((item, i) => (
        <div key={item.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                item.n < step
                  ? "bg-[#3fa876] text-white"
                  : item.n === step
                    ? "bg-[#d9834f] text-white"
                    : "bg-[#ece4dc] text-ink/40"
              }`}
            >
              {item.n < step ? <Check size={14} /> : item.n}
            </div>
            <span
              className={`text-[11px] ${
                item.n === step ? "font-medium text-ink/80" : "text-ink/40"
              }`}
            >
              {item.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className="mx-2 mb-4 h-px w-8 bg-[#ece4dc]" />
          )}
        </div>
      ))}
    </div>
  );
}

const inputWrapClass =
  "flex items-center rounded-2xl border border-[#ece0d2] bg-white px-4 py-3";
const inputClass =
  "flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30";
const cardClass =
  "mt-6 space-y-4 rounded-3xl border border-[#ece0d2] bg-[#fffdfa]/90 p-5 shadow-[0_4px_16px_rgba(120,96,84,.06)]";

type RegisterDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function RegisterDrawer({ open, onClose }: RegisterDrawerProps) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { t, i18n } = useTranslation();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // step 1：帳號
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // step 2：基本資料
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 註冊成功後先把 token/user 存在這裡，不要馬上呼叫 login()。
  // 因為 login() 一叫，App.tsx 的 RedirectIfAuthed 馬上就會判斷成已登入，
  // 把整個 /login 頁面（連同這個 drawer）導離、卸載掉，
  // 畫面根本來不及顯示 step 3 的「完成註冊」就直接跳去首頁了。
  // 改成等使用者在 step 3 按下「開始使用」時才真的 login()，導頁的時機才會對。
  const [pendingAuth, setPendingAuth] = useState<{
    token: string;
    user: AuthUser;
  } | null>(null);

  const strength = useMemo(() => strengthOf(password), [password]);

  function resetAndClose() {
    setStep(1);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setPhone("");
    setBirthday("");
    setError("");
    setPendingAuth(null);
    onClose();
  }

  function handleAccountNext() {
    setError("");
    if (!email || !password || !confirmPassword) {
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
    setStep(2);
  }

  async function handleProfileNext() {
    setError("");
    if (!name || !phone || !birthday) {
      setError(t("resetPassword.fieldsRequiredError"));
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ access_token: string; user: AuthUser }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            name,
            phone,
            birthday: birthday,
            language: i18n.language,
          }),
        },
      );
      setPendingAuth({ token: data.access_token, user: data.user });
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("login.serverError"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    if (pendingAuth) {
      login(pendingAuth.token, pendingAuth.user);
    }
    resetAndClose();
    // 剛註冊的帳號一定還沒有寵物資料，直接導去新增寵物頁面
    navigate("/add-pet");
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#f7f1e8] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      style={{
        backgroundImage: `url(${patternBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex-1 px-5 pb-8">
        <div className="mx-auto w-full max-w-sm">
          {step === 1 && (
            <>
              <Stepper step={1} />
              <div className="mt-2 text-center">
                <h2 className="text-xl font-bold text-ink">
                  {t("register.accountTitle")}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  {t("register.accountSubtitle")}
                </p>
              </div>

              <div className={cardClass}>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
                    <Mail size={14} className="text-[#5b83ab]" />
                    {t("register.emailLabel")}
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("register.emailPlaceholder")}
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
                    <Lock size={14} className="text-[#5b83ab]" />
                    {t("register.passwordLabel")}
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("resetPassword.newPasswordPlaceholder")}
                      autoComplete="new-password"
                      className={inputClass}
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
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
                    <Lock size={14} className="text-[#5b83ab]" />
                    {t("register.confirmPasswordLabel")}
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("register.confirmPasswordPlaceholder")}
                      autoComplete="new-password"
                      className={inputClass}
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
              </div>

              {error && (
                <p className="mt-3 text-center text-xs text-red-500">{error}</p>
              )}

              <button
                type="button"
                onClick={handleAccountNext}
                className="mt-5 w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
              >
                {t("common.next")}
              </button>

              <p className="mt-5 text-center text-xs text-ink/55">
                {t("register.hasAccount")}{" "}
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="font-medium text-[#4a90d9] hover:underline"
                >
                  {t("register.signInNow")}
                </button>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <Stepper step={2} />
              <div className="mt-2 text-center">
                <h2 className="text-xl font-bold text-ink">
                  {t("register.profileTitle")}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  {t("register.profileSubtitle")}
                </p>
              </div>

              <div className={cardClass}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink/80">
                    {t("register.nameLabel")}
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("register.namePlaceholder")}
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink/80">
                    {t("register.phoneLabel")}
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("register.phonePlaceholder")}
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink/80">
                    {t("register.birthdayLabel")}
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      // 字級一定要 >=16px，不然 iOS Safari 會自動把頁面
                      // zoom-in 對準這個欄位，原生 iOS 日期選擇器反而跑版
                      style={{ fontSize: 16 }}
                      className={`${inputClass} [color-scheme:light]`}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-center text-xs text-red-500">{error}</p>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl border border-[#e8c9a3] py-3.5 text-sm font-semibold text-[#c9784a] transition hover:bg-[#fbe9d9]/40"
                >
                  {t("common.previous")}
                </button>
                <button
                  type="button"
                  onClick={handleProfileNext}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:opacity-60"
                >
                  {loading ? t("healthJournal.processing") : t("common.next")}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mt-10 text-center">
                <h2 className="text-xl font-bold text-ink">
                  {t("register.doneTitle")}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  {t("register.doneSubtitleLine1")}
                  <br />
                  {t("register.doneSubtitleLine2")}
                </p>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="relative grid h-56 w-56 place-items-center rounded-full bg-[#fbe9d9]/70">
                  <img
                    src={logo}
                    alt="logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="mt-10 w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
              >
                {t("register.startButton")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
