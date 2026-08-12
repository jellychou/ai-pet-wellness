import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";

type MentorHistorySessionItem = {
  id: number;
  pet_id: number;
  is_finished: boolean;
  summary_sections: string[] | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 疊在 AICenterPage 上面的第一層 drawer（AICenterPage 本身是路由頁面，不是
// drawer，所以這裡直接疊在整個頁面上面），跟 AiScanHistoryDrawer/
// HealthJournalHistoryDrawer 是同一種「唯讀查看歷史紀錄」模式——只是每筆
// 紀錄是一整段多輪對話，所以點下去還會再疊一層 MentorHistoryDetailDrawer
// 顯示完整逐句對話，不是像其他 history drawer 直接把細節攤在卡片上
export function MentorHistoryDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.mentorHistoryOpen);
  const setOpen = useAppStore((s) => s.setMentorHistoryOpen);
  const setDetailSessionId = useAppStore(
    (s) => s.setMentorHistoryDetailSessionId,
  );
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<MentorHistorySessionItem[]>([]);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    apiFetch<MentorHistorySessionItem[]>(`/mentor/history/${petId}`, {
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
              aria-label={t("mentor.historyBackAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">
              {t("mentor.historyTitle")}
            </h1>
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {t("mentor.historyEmptyState", {
                name: selectedPet?.name ?? t("healthJournal.petFallback"),
              })}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setDetailSessionId(item.id)}
                  className="flex w-full items-center gap-2 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3 text-left transition hover:bg-[#fbf1e6]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-ink/40">
                      {formatDateTime(item.created_at)}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          item.is_finished
                            ? "bg-[#e3f3ee] text-[#3fa88f]"
                            : "bg-[#fbe9d9] text-[#b9803f]"
                        }`}
                      >
                        {item.is_finished
                          ? t("mentor.historyFinishedBadge")
                          : t("mentor.historyInProgressBadge")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink/80">
                      {item.preview}
                    </p>
                    <p className="mt-1 text-[11px] text-ink/40">
                      {t("mentor.historyMessageCount", {
                        count: item.message_count,
                      })}
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
