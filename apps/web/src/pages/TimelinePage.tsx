import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bone,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  NotebookPen,
  Plus,
  Syringe,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";
import defaultPetAvatar from "../assets/images/default-avatar.png";
import {
  fetchTimeline,
  timelineTypeMeta,
  type TimelineItem,
} from "../lib/timeline";

// 跟 DashboardPage.tsx 的 FoodCard 同一套小工具：只取本地時區的年/月/日
// 來比對是不是同一天，不要直接比字串化的完整 ISO 時間戳
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

// 健康時間軸原本是獨立路由頁面（/timeline），現在改成跟 HealthJournalDrawer/
// AiScanDrawer 同一套「fixed 全頁滑入」drawer，用 timelineOpen 這個全域狀態
// 開關——觸發點（Dashboard 快捷鍵、Sidebar、桌機版側欄）都改成 setTimelineOpen(true)
// 而不是 navigate("/timeline")
export function TimelineDrawer() {
  const { t } = useTranslation();
  const weekdays = t("common.weekdays", { returnObjects: true }) as string[];
  const open = useAppStore((s) => s.timelineOpen);
  const setOpen = useAppStore((s) => s.setTimelineOpen);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const pets = usePetStore((s) => s.pets);
  const setSelectedPet = usePetStore((s) => s.setSelectedPet);

  const setAddFoodOpen = useAppStore((s) => s.setAddFoodOpen);
  const setAddVaccineOpen = useAppStore((s) => s.setAddVaccineOpen);
  const setAiScanOpen = useAppStore((s) => s.setAiScanOpen);
  const setEditHealthOpen = useAppStore((s) => s.setEditHealthOpen);
  const setHealthJournalOpen = useAppStore((s) => s.setHealthJournalOpen);
  const foodRecordRefreshKey = useAppStore((s) => s.foodRecordRefreshKey);
  const vaccineRefreshKey = useAppStore((s) => s.vaccineRefreshKey);
  const healthRecordRefreshKey = useAppStore((s) => s.healthRecordRefreshKey);
  const healthJournalRefreshKey = useAppStore((s) => s.healthJournalRefreshKey);

  const [selectedDate, setSelectedDate] = useState(startOfToday);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // 一次抓這隻寵物「所有」時間軸事件，切換日期時在前端過濾——跟
  // DashboardPage 的 FoodCard 同樣的做法，量體小、簡單優先，不用另外
  // 加日期區間參數
  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetchTimeline(petId)
      .then(setItems)
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [
    selectedPet?.id,
    foodRecordRefreshKey,
    vaccineRefreshKey,
    healthRecordRefreshKey,
    healthJournalRefreshKey,
  ]);

  // 切換寵物時把日期重置回今天，避免看著上一隻寵物選到的舊日期卻顯示
  // 這一隻寵物的記錄
  useEffect(() => {
    setSelectedDate(startOfToday());
  }, [selectedPet?.id]);

  // 每次重新打開都回到今天、收起下拉選單，避免使用者上次關掉時停留在
  // 某個舊日期或展開狀態，下次打開卻沒發現
  useEffect(() => {
    if (!open) return;
    setSelectedDate(startOfToday());
    setPetPickerOpen(false);
    setQuickAddOpen(false);
  }, [open]);

  const dateKey = toDateKey(selectedDate);
  const isToday = dateKey === toDateKey(new Date());
  const itemsForDate = items
    .filter((item) => item.date === dateKey)
    .sort((a, b) => {
      // 有實際時間的排前面、依時間排序；沒有時間的（疫苗/健檢/健康日誌
      // 只存日期）排在後面，用 id 當次要排序，至少同一次重整順序穩定
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return b.id - a.id;
    });

  const quickAddOptions = [
    {
      Icon: Camera,
      label: t("dashboard.qaScan"),
      action: () => setAiScanOpen(true),
    },
    {
      Icon: Bone,
      label: t("dashboard.qaAddFood"),
      action: () => setAddFoodOpen(true),
    },
    {
      Icon: Syringe,
      label: t("dashboard.qaVaccine"),
      action: () => setAddVaccineOpen(true),
    },
    {
      Icon: ClipboardPlus,
      label: t("dashboard.qaCheckup"),
      action: () => setEditHealthOpen(true),
    },
    {
      Icon: NotebookPen,
      label: t("dashboard.qaJournal"),
      action: () => setHealthJournalOpen(true),
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("common.backAria")}
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="text-sm font-semibold text-ink">{t("nav.timeline")}</h1>
        <span className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4 pb-24">
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
                      selectedPet?.id === pet.id
                        ? "text-[#c9784a]"
                        : "text-ink/70"
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

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              aria-label={t("timeline.prevDayAria")}
              className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-cream"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <strong className="text-ink">
                {selectedDate.getFullYear()}/
                {String(selectedDate.getMonth() + 1).padStart(2, "0")}/
                {String(selectedDate.getDate()).padStart(2, "0")}（
                {weekdays[selectedDate.getDay()]}）
              </strong>
              {isToday && (
                <span className="rounded-full bg-[#f1e6d8] px-2 py-0.5 text-[11px] font-medium text-[#b98a5c]">
                  {t("timeline.todayPill")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              disabled={isToday}
              aria-label={t("timeline.nextDayAria")}
              className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {t("common.loading")}
            </p>
          ) : itemsForDate.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {t("timeline.emptyState")}
            </p>
          ) : (
            <div className="space-y-3">
              {itemsForDate.map((item) => {
                const meta = timelineTypeMeta[item.type];
                const Icon = meta.Icon;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3"
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${meta.iconClass}`}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {item.title}
                        </span>
                        {item.time && (
                          <span className="shrink-0 text-[11px] text-ink/35">
                            {item.time}
                          </span>
                        )}
                      </div>
                      {item.summary && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink/55">
                          {item.summary}
                        </p>
                      )}
                    </div>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : item.type === "vaccine" ? (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e3f3ee] text-[#3fa88f]">
                        <Check size={14} />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {quickAddOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setQuickAddOpen(false)}
        />
      )}
      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2 lg:bottom-8">
        {quickAddOpen && (
          <div className="mb-1 space-y-1.5 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-2 shadow-lg">
            {quickAddOptions.map(({ Icon, label, action }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setQuickAddOpen(false);
                  action();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-ink transition hover:bg-cream"
              >
                <Icon size={15} className="text-[#7591a2]" />
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setQuickAddOpen((v) => !v)}
          aria-label={t("timeline.addAria")}
          className={`grid h-10 w-10 place-items-center rounded-full bg-[#caa06f] text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] ${quickAddOpen ? "rotate-45" : ""}`}
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}
