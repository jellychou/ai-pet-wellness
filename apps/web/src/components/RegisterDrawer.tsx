import { useMemo, useState } from "react";
import {
  Calendar,
  Cat,
  Check,
  Dog,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import patternBg from "../assets/images/pattern-watermark.svg";
import logo from "../assets/images/logo.png";
import { apiFetch, ApiError } from "../lib/api";
import { useAuthStore, type AuthUser } from "../store/useAuthStore";
import { strengthOf } from "../lib/passwordStrength";

const steps = [
  { n: 1, label: "設定帳號" },
  { n: 2, label: "基本資料" },
  { n: 3, label: "完成" },
] as const;

function Stepper({ step }: { step: 1 | 2 | 3 }) {
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
  const { i18n } = useTranslation();

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
    onClose();
  }

  function handleAccountNext() {
    setError("");
    if (!email || !password || !confirmPassword) {
      setError("請完整填寫所有欄位");
      return;
    }
    if (password.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    setStep(2);
  }

  async function handleProfileNext() {
    setError("");
    if (!name || !phone || !birthday) {
      setError("請完整填寫所有欄位");
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
      login(data.access_token, data.user);
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "無法連上伺服器，請確認後端是否已啟動",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
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
                <h2 className="text-xl font-bold text-ink">建立帳號</h2>
                <p className="mt-1 text-sm text-ink/60">
                  陪伴毛孩的每一天，從註冊開始
                </p>
              </div>

              <div className={cardClass}>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
                    <Mail size={14} className="text-[#5b83ab]" />
                    電子郵件
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="請輸入電子郵件"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
                    <Lock size={14} className="text-[#5b83ab]" />
                    密碼
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="請輸入至少 8 個字元"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="顯示或隱藏密碼"
                      className="text-ink/35 transition hover:text-ink/60"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
                    <Lock size={14} className="text-[#5b83ab]" />
                    確認密碼
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="請再次輸入密碼"
                      autoComplete="new-password"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label="顯示或隱藏密碼"
                      className="text-ink/35 transition hover:text-ink/60"
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-sm text-ink/70">
                    密碼強度：
                    {password && (
                      <span
                        className="font-semibold"
                        style={{ color: strength.color }}
                      >
                        {" "}
                        {strength.label}
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
                下一步
              </button>

              <p className="mt-5 text-center text-xs text-ink/55">
                已有帳號？{" "}
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="font-medium text-[#4a90d9] hover:underline"
                >
                  立即登入
                </button>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <Stepper step={2} />
              <div className="mt-2 text-center">
                <h2 className="text-xl font-bold text-ink">基本資料</h2>
                <p className="mt-1 text-sm text-ink/60">請填寫您的基本資料</p>
              </div>

              <div className={cardClass}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink/80">
                    姓名
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="請輸入您的姓名"
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink/80">
                    電話
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="請輸入您的手機號碼"
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink/80">
                    生日
                  </label>
                  <div className={inputWrapClass}>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className={`${inputClass} [color-scheme:light]`}
                    />
                    <Calendar size={16} className="text-ink/35" />
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
                  上一步
                </button>
                <button
                  type="button"
                  onClick={handleProfileNext}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:opacity-60"
                >
                  {loading ? "處理中…" : "下一步"}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mt-2 text-center">
                <h2 className="text-xl font-bold text-ink">完成註冊</h2>
                <p className="mt-1 text-sm text-ink/60">
                  歡迎加入 Food・Heart！
                  <br />
                  開始記錄毛孩的健康與快樂生活吧！
                </p>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="relative grid h-56 w-56 place-items-center rounded-full bg-[#fbe9d9]/70">
                  <Heart
                    size={28}
                    className="absolute top-6 fill-[#e08a7b] text-[#e08a7b]"
                  />
                  <div className="flex items-end gap-3">
                    <Dog size={64} className="text-[#c9a06f]" />
                    <Cat size={56} className="text-[#7d93a6]" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="mt-10 w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
              >
                開始使用
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
