import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";

type HealthJournalHistoryItem = {
  id: number;
  pet_id: number;
  log_date: string;
  appetite: string;
  energy: string;
  activity_level: string;
  bowel_movement: string;
  vomiting: string;
  other_symptoms: string[];
  diary_text: string | null;
  photo_urls: string[];
  tags: string[];
  health_score: number;
  risk_level: string;
  summary_points: string[];
  recommendations: { maintain: string[]; watch: string[]; concern: string[] };
  added_to_timeline: boolean;
  created_at: string;
};

const RISK_COLOR: Record<string, string> = {
  低: "#3fa88f",
  中: "#d9834f",
  高: "#c9503f",
};

function formatDate(iso: string, weekdays: string[]) {
  const d = new Date(`${iso}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${
    weekdays[d.getDay()]
  }）`;
}

// 疊在 HealthJournalDrawer 上面的第二層 drawer（z-[60] > HealthJournalDrawer
// 的 z-50），跟 FoodScanHistoryDrawer 疊在 AddFoodDrawer 上面同一個模式——
// 純唯讀查看，不能在這裡編輯過去的日誌
export function HealthJournalHistoryDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.healthJournalHistoryOpen);
  const setOpen = useAppStore((s) => s.setHealthJournalHistoryOpen);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<HealthJournalHistoryItem[]>([]);
  const weekdays = t("common.weekdays", { returnObjects: true }) as string[];

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    apiFetch<HealthJournalHistoryItem[]>(`/health-journal/history/${petId}`, {
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
              aria-label={t("healthJournal.backToJournalAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">
              {t("healthJournal.headerEntry")}
            </h1>
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {t("healthJournal.emptyState", {
                name: selectedPet?.name ?? t("healthJournal.petFallback"),
              })}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink/40">
                      {formatDate(item.log_date, weekdays)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: RISK_COLOR[item.risk_level] ?? "#8a8a8a",
                        backgroundColor: `${RISK_COLOR[item.risk_level] ?? "#8a8a8a"}1a`,
                      }}
                    >
                      {t("healthJournal.riskSuffix", {
                        level: t(`healthJournal.risk.${item.risk_level}`, {
                          defaultValue: item.risk_level,
                        }),
                      })}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-lg font-bold text-ink">
                      {item.health_score}
                      <span className="text-[10px] font-normal text-ink/40">
                        /100
                      </span>
                    </span>
                    <span className="text-[11px] text-ink/40">
                      {t("healthJournal.fieldAppetite")}{" "}
                      {t(`healthJournal.option.${item.appetite}`, {
                        defaultValue: item.appetite,
                      })}
                      ・{t("healthJournal.fieldEnergy")}{" "}
                      {t(`healthJournal.option.${item.energy}`, {
                        defaultValue: item.energy,
                      })}
                      ・{t("healthJournal.fieldActivity")}{" "}
                      {t(`healthJournal.option.${item.activity_level}`, {
                        defaultValue: item.activity_level,
                      })}
                    </span>
                  </div>
                  {item.summary_points.length > 0 && (
                    <p className="mt-1.5 truncate text-[11px] text-ink/50">
                      {item.summary_points[0]}
                    </p>
                  )}
                  {item.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-ink/50"
                        >
                          {t(`healthJournal.tag.${tag}`, { defaultValue: tag })}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.added_to_timeline && (
                    <p className="mt-1.5 text-[10px] font-medium text-[#b98a5c]">
                      {t("healthJournal.addedToTimelineNote")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
