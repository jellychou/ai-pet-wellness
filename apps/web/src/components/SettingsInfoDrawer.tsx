import { ChevronLeft, FileText, HelpCircle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";

type TermsSection = { title: string; body: string };
type FaqItem = { q: string; a: string };

// SettingsPage 底部三個 Row（關於 Pet Wellness／使用條款／常見問題）共用同一個
// drawer，比照 ChangePasswordDrawer 的 fixed 全頁滑入樣式；用 settingsInfoOpen
// 決定要顯示哪一種內容，關閉時仍維持上一次顯示的內容直到滑出動畫結束，避免
// 內容在收合過程中突然變空白
export function SettingsInfoDrawer() {
  const { t } = useTranslation();
  const type = useAppStore((s) => s.settingsInfoOpen);
  const setType = useAppStore((s) => s.setSettingsInfoOpen);
  const open = type !== null;

  function handleBack() {
    setType(null);
  }

  const titleKey =
    type === "terms"
      ? "settingsInfo.termsTitle"
      : type === "faq"
        ? "settingsInfo.faqTitle"
        : "settingsInfo.aboutTitle";
  const Icon = type === "terms" ? FileText : type === "faq" ? HelpCircle : Info;

  const aboutFeatures = t("settingsInfo.aboutFeatures", {
    returnObjects: true,
  }) as string[];
  const termsSections = t("settingsInfo.termsSections", {
    returnObjects: true,
  }) as TermsSection[];
  const faqItems = t("settingsInfo.faqItems", {
    returnObjects: true,
  }) as FaqItem[];

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
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
          aria-label={t("settingsInfo.backAria")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">{t(titleKey)}</h1>
        <span className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-md space-y-5">
          {type === "about" && (
            <>
              <div className="flex flex-col items-center text-center">
                <p className="mt-3 text-sm font-medium text-[#c9784a]">
                  {t("settingsInfo.aboutTagline")}
                </p>
              </div>
              <p className="text-sm leading-6 text-ink/70">
                {t("settingsInfo.aboutIntro")}
              </p>
              <div>
                <div className="mb-2 text-sm font-semibold text-[#d9834f]">
                  {t("settingsInfo.aboutFeaturesTitle")}
                </div>
                <ul className="space-y-2">
                  {aboutFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] px-4 py-3 text-[13px] leading-5 text-ink/70"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-[#fbf1e6] p-4 text-[12px] leading-5 text-ink/60">
                {t("settingsInfo.aboutDisclaimer")}
              </div>
              <p className="text-center text-xs text-ink/35">
                {t("settingsInfo.aboutVersion")} v1.0.0
              </p>
            </>
          )}

          {type === "terms" && (
            <>
              <p className="text-sm leading-6 text-ink/70">
                {t("settingsInfo.termsIntro")}
              </p>
              <div className="space-y-3">
                {termsSections.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4"
                  >
                    <div className="mb-1 text-sm font-semibold text-ink">
                      {section.title}
                    </div>
                    <p className="text-[13px] leading-5 text-ink/60">
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {type === "faq" && (
            <div className="space-y-3">
              {faqItems.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4"
                >
                  <div className="mb-1.5 flex items-start gap-1.5 text-sm font-semibold text-ink">
                    <HelpCircle
                      size={15}
                      className="mt-0.5 shrink-0 text-[#c9784a]"
                    />
                    {item.q}
                  </div>
                  <p className="pl-[21px] text-[13px] leading-5 text-ink/60">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
