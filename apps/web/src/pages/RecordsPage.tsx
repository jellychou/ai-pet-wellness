import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${
    WEEKDAY_LABELS[d.getDay()]
  }）`;
}

// 這一頁原本是疫苗/健檢/AI 影像混合的通用時間軸，現在改成「健康日誌」主頁：
// 直接讀 health_journal_logs 的完整歷史（不像 /timeline 只挑
// added_to_timeline=True 的那幾筆），並提供「+」直接開新一篇日誌
export function RecordsPage() {
  const selectedPet = usePetStore((s) => s.selectedPet);
  const setHealthJournalOpen = useAppStore((s) => s.setHealthJournalOpen);
  const refreshKey = useAppStore((s) => s.healthJournalRefreshKey);
  const [items, setItems] = useState<HealthJournalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) return;
    setLoading(true);
    apiFetch<HealthJournalHistoryItem[]>(`/health-journal/history/${petId}`, {
      method: "GET",
    })
      .then(setItems)
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [selectedPet?.id, refreshKey]);

  return (
    <section className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setHealthJournalOpen(true)}
          aria-label="新增健康日誌"
          className="grid h-9 w-9 place-items-center rounded-full bg-[#b98a5c] text-white shadow-[0_8px_18px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d]"
        >
          <Plus size={18} />
        </button>
      </div>

      {!loading && items.length === 0 && (
        <p className="py-10 text-center text-sm text-ink/40">
          {selectedPet?.name ?? "這隻寵物"}{" "}
          還沒有健康日誌記錄，按右上角「+」新增一篇
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/40">
                {formatDate(item.log_date)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: RISK_COLOR[item.risk_level] ?? "#8a8a8a",
                  backgroundColor: `${RISK_COLOR[item.risk_level] ?? "#8a8a8a"}1a`,
                }}
              >
                {item.risk_level}風險
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold text-ink">
                {item.health_score}
                <span className="text-[10px] font-normal text-ink/40">
                  /100
                </span>
              </span>
              <span className="text-xs text-ink/40">
                食慾 {item.appetite}・精神 {item.energy}・活動量{" "}
                {item.activity_level}
              </span>
            </div>
            {item.summary_points.length > 0 && (
              <p className="mt-1.5 text-xs text-ink/60">
                {item.summary_points[0]}
              </p>
            )}
            {item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-ink/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {item.added_to_timeline && (
              <p className="mt-2 text-[10px] font-medium text-[#b98a5c]">
                已加入健康時間軸
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
