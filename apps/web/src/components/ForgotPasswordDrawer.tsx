import { useState } from "react";
import { Cat, ChevronLeft, Dog, Heart, Mail, PawPrint } from "lucide-react";
import { useTranslation } from "react-i18next";
import patternBg from "../assets/images/pattern-watermark.svg";
import { ResetLinkSentSheet } from "./ResetLinkSentSheet";
import { apiFetch, ApiError } from "../lib/api";

type ForgotPasswordDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordDrawer({
  open,
  onClose,
}: ForgotPasswordDrawerProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function resetAndClose() {
    setEmail("");
    setError("");
    setSent(false);
    onClose();
  }

  async function handleSubmit() {
    setError("");
    if (!email) {
      setError(t("forgotPassword.emailRequiredError"));
      return;
    }
    if (!emailPattern.test(email)) {
      setError(t("forgotPassword.emailInvalidError"));
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("login.serverError"),
      );
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center px-5 pt-5">
        <button
          type="button"
          onClick={resetAndClose}
          aria-label={t("common.backAria")}
          className="grid h-9 w-9 place-items-center rounded-full text-ink/60 transition hover:bg-white/60"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex-1 px-5 pb-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mt-2 text-center">
            <h2 className="inline-flex items-center gap-1.5 text-xl font-bold text-ink">
              {t("forgotPassword.title")}
              <PawPrint size={16} className="text-[#c9a06f]" />
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              {t("forgotPassword.subtitleLine1")}
              <br />
              {t("forgotPassword.subtitleLine2")}
            </p>
          </div>

          <div className="mt-6 space-y-4 rounded-3xl border border-[#ece0d2] bg-[#fffdfa]/90 p-5 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-white px-4 py-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dbe7f4] text-[#5b83ab]">
                <Mail size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-[11px] text-ink/45">
                  {t("register.emailLabel")}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  autoComplete="email"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
                />
              </span>
            </label>
          </div>

          {error && (
            <p className="mt-3 text-center text-xs text-red-500">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:opacity-60"
          >
            {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={resetAndClose}
              className="text-xs font-medium text-[#4a90d9] hover:underline"
            >
              {t("resetPassword.backAria")}
            </button>
          </div>

          <div className="relative mx-auto mt-10 flex h-40 w-full max-w-[280px] items-end justify-center">
            <Heart
              size={16}
              className="absolute left-2 top-2 fill-[#e8b9a8] text-[#e8b9a8]"
            />
            <Heart
              size={12}
              className="absolute right-4 top-8 fill-[#e8b9a8] text-[#e8b9a8]"
            />
            <PawPrint
              size={16}
              className="absolute right-0 top-0 text-[#c9a06f]/60"
            />
            <PawPrint
              size={14}
              className="absolute bottom-2 left-0 text-[#c9a06f]/50"
            />
          </div>
        </div>
      </div>

      <ResetLinkSentSheet
        open={sent}
        email={email}
        onClose={() => setSent(false)}
        onGoToInbox={resetAndClose}
        onResend={handleSubmit}
      />
    </div>
  );
}
