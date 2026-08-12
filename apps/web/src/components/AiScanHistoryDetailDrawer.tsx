import { ArrowLeft, CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 疊在 AiScanHistoryDrawer 上面的第三層 drawer（z-[70] > AiScanHistoryDrawer
// 的 z-[60]）：列表只顯示部分資料（照片/日期/摘要），點某一筆才在這裡看
// 完整內容（findings 逐項信心度＋suggestions），跟 HealthJournalDetailDrawer
// 是同一種「列表精簡、詳情另開」模式
export function AiScanHistoryDetailDrawer() {
  const { t } = useTranslation();
  const item = useAppStore((s) => s.aiScanHistoryDetailItem);
  const setItem = useAppStore((s) => s.setAiScanHistoryDetailItem);
  const open = item !== null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setItem(null)}
              aria-label={t("aiScan.detailBackAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">
              {t("aiScan.detailTitle")}
            </h1>
          </div>

          {item && (
            <>
              <img
                src={item.image_url}
                alt={t("aiScan.historyPhotoAlt")}
                className="h-56 w-full rounded-2xl object-cover"
              />

              <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink/40">
                {formatDateTime(item.created_at)}
                {item.body_part && (
                  <span className="rounded-full bg-[#f1e6d8] px-1.5 py-0.5 text-[10px] font-medium text-[#b98a5c]">
                    {item.body_part}
                  </span>
                )}
                {item.added_to_timeline && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[#3fa88f]">
                    <CalendarCheck size={10} />
                    {t("aiScan.historyAddedToTimelineBadge")}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                <div className="text-xs text-ink/45">
                  {t("aiScan.resultTitle")}
                </div>
                {item.summary && (
                  <p className="mt-2 text-sm text-ink/80">{item.summary}</p>
                )}
                {item.findings && item.findings.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {item.findings.map((finding) => (
                      <div key={finding.condition}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink/80">
                            {finding.condition}
                          </span>
                          <span className="font-semibold text-ink">
                            {finding.confidence}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eee5da]">
                          <div
                            className="h-full rounded-full bg-mist"
                            style={{ width: `${finding.confidence}%` }}
                          />
                        </div>
                        {finding.description && (
                          <p className="mt-1 text-xs text-ink/50">
                            {finding.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/60">
                    {t("aiScan.noAbnormalFound")}
                  </p>
                )}
              </div>

              {item.suggestions && item.suggestions.length > 0 && (
                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                  <div className="text-xs text-ink/45">
                    {t("aiScan.suggestionsTitle")}
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {item.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex gap-1.5 text-sm text-ink/70">
                        <span className="text-mist">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
