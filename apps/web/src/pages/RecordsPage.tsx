import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { calculateAge } from "../lib/utils";
import defaultPetAvatar from "../assets/images/default-avatar.png";

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

// 跟 DashboardPage 的 FoodCard 同一套「本地時區年/月/日」日期選擇邏輯，
// 不要直接比對帶時區的完整 ISO 字串，避免跨時區/跨日界線比錯
function toDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, delta: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// 這一頁原本是疫苗/健檢/AI 影像混合的通用時間軸，現在改成「健康日誌」主頁：
// 直接讀 health_journal_logs 的完整歷史（不像 /timeline 只挑
// added_to_timeline=True 的那幾筆），並提供「+」直接開新一篇日誌
export function RecordsPage() {
  const { t } = useTranslation();
  const selectedPet = usePetStore((s) => s.selectedPet);
  const pets = usePetStore((s) => s.pets);
  const setSelectedPet = usePetStore((s) => s.setSelectedPet);
  const setHealthJournalOpen = useAppStore((s) => s.setHealthJournalOpen);
  const refreshKey = useAppStore((s) => s.healthJournalRefreshKey);
  const [items, setItems] = useState<HealthJournalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(startOfToday);
  const weekdays = t("common.weekdays", { returnObjects: true }) as string[];

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

  // 切換寵物時把日期重置回今天，理由跟 FoodCard 一樣：避免看著上一隻寵物
  // 選到的舊日期卻顯示這一隻寵物的記錄
  useEffect(() => {
    setSelectedDate(startOfToday());
  }, [selectedPet?.id]);

  const dateKey = toDateKey(selectedDate);
  const isToday = dateKey === toDateKey(new Date());
  const itemsForDate = items.filter((item) => item.log_date === dateKey);

  return (
    <section className="mx-auto max-w-md space-y-4">
      {/* 跟 AddVaccineFormDrawer.tsx 的 petHeader 同一套切換邏輯：只有
          名字＋箭頭是觸發區，下拉列出全部寵物（含目前這隻，用橘字標示），
          不是只列「其他」寵物 */}
      <div className="relative flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3">
        <img
          src={selectedPet?.avatar ?? defaultPetAvatar}
          alt={selectedPet?.name ?? ""}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setPetPickerOpen((v) => !v)}
            aria-label={t("timeline.switchPetAria")}
            className="flex items-center gap-1 text-sm font-semibold text-ink"
          >
            {selectedPet?.name}
            <ChevronDown size={14} className="text-ink/40" />
          </button>
          {selectedPet && (
            <div className="truncate text-xs text-ink/45">
              {t("timeline.ageBreedWeight", {
                age: calculateAge(selectedPet.birthday),
                breed: selectedPet.breed,
                weight: selectedPet.weight,
              })}
            </div>
          )}
        </div>

        {petPickerOpen && (
          <div className="absolute left-3 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[#ece4dc] bg-white shadow-lg">
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => {
                  setSelectedPet(pet);
                  setPetPickerOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-[#fbf7f1] ${
                  selectedPet?.id === pet.id ? "text-[#c9784a]" : "text-ink/70"
                }`}
              >
                <img
                  src={pet.avatar ?? defaultPetAvatar}
                  alt={pet.name}
                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                />
                {pet.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 跟 DashboardPage 的 FoodCard 同一套日期選擇器樣式：上一天/下一天
          箭頭＋置中日期，今天不能再往後按 */}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label={t("dashboard.prevDay")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-cream"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-ink">
          {formatDate(dateKey, weekdays)}
          {isToday && (
            <span className="ml-1 text-xs font-normal text-ink/40">
              {t("dashboard.today")}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          disabled={isToday}
          aria-label={t("dashboard.nextDay")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {!loading && itemsForDate.length === 0 && (
        <p className="py-10 text-center text-sm text-ink/40">
          {t("healthJournal.emptyState", {
            name: selectedPet?.name ?? t("healthJournal.petFallback"),
          })}
        </p>
      )}

      {/* 每一篇日誌直接把完整內容顯示在列表上，不用再點進去看詳情 */}
      <div className="space-y-3">
        {itemsForDate.map((item) => (
          <div
            key={item.id}
            className="space-y-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-ink">
                {item.health_score}
                <span className="text-[10px] font-normal text-ink/40">
                  /100
                </span>
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-semibold"
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

            {/* 今日狀況：食慾/精神/活動量/排便/嘔吐五項固定選項一次全部
                顯示，不是只挑其中三項 */}
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  [t("healthJournal.fieldAppetite"), item.appetite],
                  [t("healthJournal.fieldEnergy"), item.energy],
                  [t("healthJournal.fieldActivity"), item.activity_level],
                  [t("healthJournal.fieldBowel"), item.bowel_movement],
                  [t("healthJournal.fieldVomit"), item.vomiting],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-cream/60 px-1 py-1.5 text-center"
                >
                  <div className="text-[9px] text-ink/40">{label}</div>
                  <div className="mt-0.5 text-[12px] font-medium text-ink/75">
                    {t(`healthJournal.option.${value}`, {
                      defaultValue: value,
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 狀況記錄：使用者自己輸入的其他症狀，跟上面五個固定選項的
                「今日狀況」分開顯示 */}
            {item.other_symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.other_symptoms.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#fdf1e6] px-2 py-0.5 text-[10px] font-medium text-[#c9784a]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {item.summary_points.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold text-ink/40">
                  {t("healthJournal.summaryTitle")}
                </div>
                <p className="text-xs leading-5 text-ink/60">
                  {item.summary_points[0]}
                </p>
              </div>
            )}

            {item.diary_text && (
              <div>
                <div className="mb-1 text-[10px] font-semibold text-ink/40">
                  {t("healthJournal.diaryLabel")}
                </div>
                <p className="rounded-xl bg-[#fbf7f1] p-2.5 text-xs leading-5 text-ink/70">
                  {item.diary_text}
                </p>
              </div>
            )}

            {item.photo_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {item.photo_urls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ))}
              </div>
            )}

            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
              <p className="text-[10px] font-medium text-[#b98a5c]">
                {t("healthJournal.addedToTimelineNote")}
              </p>
            )}
          </div>
        ))}
      </div>
      {/* 跟 TimelinePage.tsx 的浮動「+」同一個位置/z-index：固定在整個
          頁面右下角，不會跟著列表內容捲走，手機版留高度避開底部導覽列，
          桌機版沒有底部導覽列所以貼近底邊就好 */}
      <button
        type="button"
        onClick={() => setHealthJournalOpen(true)}
        aria-label={t("timeline.addAria")}
        className="fixed bottom-24 right-5 z-40 grid h-10 w-10 place-items-center rounded-full bg-[#688696] text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] lg:bottom-8"
      >
        <Plus size={18} />
      </button>
    </section>
  );
}
