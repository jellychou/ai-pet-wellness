import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore, type AiScanHistoryItem } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 疊在 AiScanDrawer 上面的第二層 drawer（z-[60] > AiScanDrawer 的 z-50），
// 跟 HealthDetailDrawer 疊在 EditHealthDrawer 上面是同一個模式：點「返回」
// 只關掉自己，底下的 AiScanDrawer 本來就還開著，不用特別處理
export function AiScanHistoryDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.aiScanHistoryOpen);
  const setOpen = useAppStore((s) => s.setAiScanHistoryOpen);
  const setDetailItem = useAppStore((s) => s.setAiScanHistoryDetailItem);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<AiScanHistoryItem[]>([]);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    apiFetch<AiScanHistoryItem[]>(`/ai-scan/history/${petId}`, {
      method: "GET",
    })
      .then(setItems)
      .catch((error) => console.error(error));
  }, [open, selectedPet?.id]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
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
              onClick={() => setOpen(false)}
              aria-label={t("aiScan.historyBackAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">
              {t("aiScan.historyTitle")}
            </h1>
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {t("aiScan.historyEmptyState", {
                name: selectedPet?.name ?? t("healthJournal.petFallback"),
              })}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDetailItem(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3 text-left transition hover:bg-[#fbf7f1]"
                >
                  <img
                    src={item.image_url}
                    alt={t("aiScan.historyPhotoAlt")}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-ink/40">
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
                    <p className="mt-1 truncate text-sm text-ink/80">
                      {item.summary}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink/30" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
