import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import patternBg from "../assets/images/pattern-watermark.svg";
import logo from "../assets/images/logo.png";
import { apiFetch, ApiError } from "../lib/api";
import { useAuthStore, type AuthUser } from "../store/useAuthStore";
import { RegisterDrawer } from "../components/RegisterDrawer";
import { ForgotPasswordDrawer } from "../components/ForgotPasswordDrawer";

function BrandMark() {
  return <img src={logo} alt="logo" width={200} />;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ access_token: string; user: AuthUser }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      login(data.access_token, data.user);
      navigate("/");
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

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f7f1e8]"
      style={{
        backgroundImage: `url(${patternBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
      }}
    >
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <BrandMark />
            <p className="mt-1 text-xs text-ink/55">{t("login.tagline")}</p>
          </div>

          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold text-ink">{t("login.title")}</h2>
            <p className="mt-1 text-sm text-ink/60">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7">
            <div className="space-y-4">
              <label className="flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa]/90 px-4 py-2 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dbe7f4] text-[#5b83ab]">
                  <Mail size={16} />
                </span>
                <span className="flex-1">
                  <span className="block text-[11px] text-ink/45">
                    {t("login.email")}
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login.email")}
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
                    required
                  />
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa]/90 px-4 py-2 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dbe7f4] text-[#5b83ab]">
                  <Lock size={16} />
                </span>
                <span className="flex-1">
                  <span className="block text-[11px] text-ink/45">
                    {t("login.password")}
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
                    required
                  />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-ink/35 transition hover:text-ink/60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>
            </div>

            <div className="flex justify-end mb-[12px] mt-[6px]">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs font-medium text-[#4a90d9] hover:underline"
              >
                {t("login.forgot")}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:opacity-60"
            >
              {loading ? t("login.loggingIn") : t("login.submit")}
            </button>

            {error && (
              <p className="mt-2 text-center text-xs text-red-500">{error}</p>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-ink/55">
            {t("login.noAccount")}{" "}
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="font-medium text-[#4a90d9] hover:underline"
            >
              {t("login.signUp")}
            </button>
          </p>
        </div>
      </div>

      <RegisterDrawer open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <ForgotPasswordDrawer open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
