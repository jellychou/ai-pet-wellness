import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import patternBg from "../assets/images/pattern-watermark.svg";
import logo from "../assets/images/logo.png";
import { apiFetch, ApiError } from "../lib/api";
import { useAuthStore, type AuthUser } from "../store/useAuthStore";
import { RegisterDrawer } from "../components/RegisterDrawer";
import { ForgotPasswordDrawer } from "../components/ForgotPasswordDrawer";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function BrandMark() {
  return <img src={logo} alt="logo" width={200} />;
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-4z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.1 3 9.2 7.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 9.9-2 13.4-5.3l-6.2-5.2c-2 1.4-4.6 2.3-7.2 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.1 40.5 16 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.2 5.2C41 35.7 45 30.4 45 24c0-1.4-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [hasPet, setHasPet] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCredentialResponse(response: CredentialResponse) {
      setGoogleLoading(true);
      setGoogleError("");
      try {
        const data = await apiFetch<{ access_token: string; user: AuthUser }>(
          "/auth/google",
          {
            method: "POST",
            body: JSON.stringify({ credential: response.credential }),
          },
        );
        login(data.access_token, data.user);
        localStorage.setItem("token", data.access_token);
        setHasPet(data.user.pets.length > 0);
        navigate(hasPet ? "/" : "/add-pet");
      } catch (err) {
        setGoogleError(
          err instanceof ApiError
            ? err.message
            : "無法連上伺服器，請確認後端是否已啟動",
        );
      } finally {
        setGoogleLoading(false);
      }
    }

    function init() {
      if (cancelled) return;
      if (!window.google || !googleButtonRef.current) {
        window.setTimeout(init, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 320,
      });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [login, navigate, hasPet]);

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
      localStorage.setItem("token", data.access_token);
      setHasPet(data.user.pets.length > 0);
      navigate(hasPet ? "/" : "/add-pet");
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

          <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-[#e6dccd]" />
            {t("login.or")}
            <span className="h-px flex-1 bg-[#e6dccd]" />
          </div>

          <div className="relative w-full">
            <button
              type="button"
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ece0d2] bg-white py-3.5 text-sm font-medium text-ink shadow-[0_4px_16px_rgba(120,96,84,.06)] transition hover:bg-[#faf6f0] disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? t("login.loggingIn") : t("login.google")}
            </button>
            {/* Google 官方按鈕渲染在這裡，用 opacity:0 疊在上面的自訂按鈕上，
                這樣畫面看起來是我們自己設計的按鈕，但點擊的其實是 Google 真正的按鈕 */}
            <div
              ref={googleButtonRef}
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl opacity-0"
              aria-hidden="true"
            />
          </div>
          {googleError && (
            <p className="mt-2 text-center text-xs text-red-500">
              {googleError}
            </p>
          )}

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

      <RegisterDrawer
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
      <ForgotPasswordDrawer
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
      />
    </div>
  );
}
