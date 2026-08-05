import { useEffect, useState } from "react";
import { Check, MailCheck, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type ResetLinkSentSheetProps = {
  open: boolean;
  email: string;
  onClose: () => void;
  onGoToInbox: () => void;
  onResend: () => void;
};

const COUNTDOWN_SECONDS = 60;

export function ResetLinkSentSheet({
  open,
  email,
  onClose,
  onResend,
}: ResetLinkSentSheetProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!open) return;
    setCountdown(COUNTDOWN_SECONDS);
    const timer = window.setInterval(() => {
      setCountdown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  function handleResend() {
    if (countdown > 0) return;
    onResend();
    setCountdown(COUNTDOWN_SECONDS);
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl bg-white px-6 pt-6 shadow-[0_-10px_30px_rgba(0,0,0,.12)] transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="mx-auto w-full max-w-sm">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="grid h-8 w-8 place-items-center rounded-full text-ink/50 transition hover:bg-cream"
            >
              <X size={18} />
            </button>
          </div>

          <div className="-mt-2 flex flex-col items-center text-center">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[#fbe9d9]">
                <MailCheck size={32} className="text-[#c9784a]" />
              </div>
              <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[#3fa876] text-white shadow-sm">
                <Check size={14} />
              </span>
              <Sparkles
                size={16}
                className="absolute -left-3 -top-2 text-[#e0a94f]"
              />
              <Sparkles
                size={12}
                className="absolute -right-2 top-1 text-[#e0a94f]"
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-ink">
              {t("resetLinkSent.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              {t("resetLinkSent.bodyLine1")}
              <br />
              <span className="font-semibold text-ink">{email}</span>
              <br />
              {t("resetLinkSent.bodyLine2")}
            </p>
            <p className="mt-2 text-xs text-ink/45">
              {t("resetLinkSent.hint")}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0}
              className="w-full rounded-full border border-[#e8c9a3] py-3.5 text-sm font-semibold text-[#c9784a] transition hover:bg-[#fbe9d9]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {countdown > 0
                ? t("resetLinkSent.resendWithCountdown", { seconds: countdown })
                : t("resetLinkSent.resend")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
