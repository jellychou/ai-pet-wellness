import { useEffect, useState } from "react";
import {
  Bone,
  Camera,
  ClipboardPlus,
  Droplets,
  Flame,
  Heart,
  HeartPulse,
  History,
  NotebookPen,
  Syringe,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";
import {
  calculateDailyCalories,
  calculateMacros,
  sumCalories,
} from "../lib/calorie";
import { calculateDailyWaterTargetMl } from "../lib/water";
import { apiFetch } from "../lib/api";
import defaultPetAvatar from "../assets/images/default-avatar.png";
import petEat from "../assets/images/pet-eat.png";

function Metric({
  icon: Icon,
  title,
  value,
  unit,
  tone = "blue",
}: {
  icon: typeof Heart;
  title: string;
  value: string;
  unit?: string;
  tone?: "blue" | "peach" | "cream";
}) {
  const colors =
    tone === "peach"
      ? "bg-[#fff2e9] text-[#d97c51]"
      : tone === "cream"
        ? "bg-[#f7f0df] text-[#b58d59]"
        : "bg-[#eef3f6] text-[#7693a5]";
  return (
    <div className="soft-card p-3">
      <div className="flex items-center gap-2 text-[12px] text-ink/55">
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg ${colors}`}
        >
          <Icon size={15} />
        </span>
        {title}
      </div>
      <div className="mt-2 text-xl font-semibold">
        {value}
        <span className="ml-1 text-[12px] font-normal text-ink/45">{unit}</span>
      </div>
    </div>
  );
}

// function VaccineCard({ onAddVaccine }: { onAddVaccine: () => void }) {
//   const vaccines = [
//     ["狂犬病疫苗", "Rabies", "2026/05/02", "已施打"],
//     ["DHPP 五合一疫苗", "DHPP", "2025/10/10", "已施打"],
//     ["鉤端螺旋體疫苗", "Leptospirosis", "2026/06/15", "待施打"],
//   ];
//   return (
//     <section className="card p-4">
//       <div className="mb-3 flex items-center justify-between">
//         <h2 className="section-title">疫苗記錄 / Vaccine</h2>
//       </div>
//       <div className="mb-3 flex gap-6 border-b border-[#ece4dc] text-[12px]">
//         <span className="border-b-2 border-[#7693a5] pb-2">全部</span>
//         <span>已接種</span>
//         <span>待接種</span>
//       </div>
//       <div className="space-y-2">
//         {vaccines.map((v, i) => (
//           <div
//             key={v[0]}
//             className="flex items-center gap-3 rounded-xl bg-[#fbf7f1] p-3"
//           >
//             <Syringe
//               size={24}
//               className={i === 2 ? "text-[#e78154]" : "text-[#8083c9]"}
//             />
//             <div className="min-w-0 flex-1">
//               <div className="text-[11px] font-semibold">{v[0]}</div>
//               <div className="text-[9px] text-ink/45">{v[1]}</div>
//               <div className="mt-1 text-[9px]">{v[2]}</div>
//             </div>
//             <span
//               className={`pill ${i === 2 ? "bg-[#f4ddc3] text-[#a46e3d]" : "bg-[#dce8ed] text-[#5d7c8c]"}`}
//             >
//               {v[3]}
//             </span>
//           </div>
//         ))}
//       </div>
//       <button
//         onClick={onAddVaccine}
//         className="mt-3 w-full rounded-xl bg-[#b88672] py-2 text-xs text-white"
//       >
//         ＋ 新增疫苗
//       </button>
//     </section>
//   );
// }

// 一項食材（FoodRecordEntry.items 底下的一筆）——跟後端 FoodRecordItemOut
// 對應，命名加 Entry 前綴避免跟 store 裡 AddFoodDrawer 用的 FoodDraftItem
// 搞混，那個是「還沒送出」的暫存項目，這個是「已經存進資料庫」的
type FoodRecordEntryItem = {
  id: number;
  food_name: string;
  image_url: string | null;
  portion_grams: number;
  calories: number;
};

// 一筆飲食記錄＝一餐，底下可能混合多個食材（見 apps/api 的
// food_records + food_record_items 拆表設計），total_calories 是後端
// 算好的加總，不用自己再 reduce items 一次
type FoodRecordEntry = {
  id: number;
  pet_id: number;
  items: FoodRecordEntryItem[];
  total_calories: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  fed_at: string;
  note: string | null;
};

// 頂部「健康分數」卡片只關心今天這一筆——只挑 log_date 對到今天的那筆,
// 只取需要的兩個欄位,不用整份 HealthJournalHistoryItemOut
type HealthJournalHistoryEntry = {
  log_date: string;
  health_score: number;
};

type WaterTodaySummary = { total_ml: number };

// 心情狀態沒有後端欄位,用「今天的健康分數」門檻推算,跟健康日誌 AI 給分的
// 分佈區間(75-90 算正常)對齊,不是隨便訂的數字
function moodFromScore(score: number): "good" | "normal" | "watch" {
  if (score >= 80) return "good";
  if (score >= 50) return "normal";
  return "watch";
}

const mealTypeOrder: {
  value: FoodRecordEntry["meal_type"];
  labelKey: string;
  icon: string;
}[] = [
  { value: "breakfast", labelKey: "dashboard.mealBreakfast", icon: "🌅" },
  { value: "lunch", labelKey: "dashboard.mealLunch", icon: "☀️" },
  { value: "dinner", labelKey: "dashboard.mealDinner", icon: "🌙" },
  { value: "snack", labelKey: "dashboard.mealSnack", icon: "🍪" },
];

// 只取「本地時區的年/月/日」來比對是不是同一天，不要直接比字串化的完整
// ISO 時間戳——fed_at 帶時區資訊，直接切字串在跨時區/跨日界線時會比錯
function toDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, delta: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

function formatDateHeader(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()} / ${pad(d.getMonth() + 1)} / ${pad(d.getDate())}`;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function FoodCard({ onAddFood }: { onAddFood: () => void }) {
  const { t } = useTranslation();
  const selectedPet = usePetStore((s) => s.selectedPet);
  const foodRecordRefreshKey = useAppStore((s) => s.foodRecordRefreshKey);
  const [selectedDate, setSelectedDate] = useState(startOfToday);
  const [records, setRecords] = useState<FoodRecordEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // 一次抓這隻寵物「所有」飲食記錄，切換日期時在前端過濾——後端
  // /food/food-records/{pet_id} 目前沒有日期區間參數，量體小、簡單優先
  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    apiFetch<FoodRecordEntry[]>(`/food/food-records/${petId}`, {
      method: "GET",
    })
      .then(setRecords)
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [selectedPet?.id, foodRecordRefreshKey]);

  // 切換寵物時把日期重置回今天，避免看著上一隻寵物選到的舊日期卻顯示
  // 這一隻寵物的記錄，容易誤會成「這隻今天沒吃東西」
  useEffect(() => {
    setSelectedDate(startOfToday());
  }, [selectedPet?.id]);

  const dateKey = toDateKey(selectedDate);
  const isToday = dateKey === toDateKey(new Date());
  const recordsForDate = records.filter(
    (r) => toDateKey(new Date(r.fed_at)) === dateKey,
  );
  // sumCalories 吃的是 { calories: number }[]，這裡拿每筆記錄後端算好的
  // total_calories 加總，不用自己重新展開 items 再 reduce 一次
  const totalCalories = sumCalories(
    recordsForDate.map((r) => ({ calories: r.total_calories })),
  );
  const dailyCalories = selectedPet
    ? calculateDailyCalories(selectedPet)
    : null;

  // 一筆記錄可能混合多個食材，畫面上是「每個食材各自一行」，所以要把
  // recordsForDate 依 meal_type 分組後，再把每筆記錄底下的 items 展開成
  // 一行一行——key 用 `${record.id}-${item.id}`，同一個食材名稱在不同
  // 記錄裡出現多次也不會撞 key
  const groups = mealTypeOrder
    .map((meal) => ({
      ...meal,
      items: recordsForDate
        .filter((r) => r.meal_type === meal.value)
        .flatMap((r) =>
          r.items.map((item) => ({
            key: `${r.id}-${item.id}`,
            food_name: item.food_name,
            portion_grams: item.portion_grams,
            calories: item.calories,
          })),
        ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">{t("dashboard.foodRecordTitle")}</h2>
      </div>
      <div className="mb-3 flex items-center justify-between text-[12px]">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label={t("dashboard.prevDay")}
          className="grid h-6 w-6 place-items-center rounded-full text-ink/60 transition hover:bg-cream"
        >
          ‹
        </button>
        <strong>
          {formatDateHeader(selectedDate)}
          {isToday && (
            <span className="ml-1 font-normal text-ink/40">
              {t("dashboard.today")}
            </span>
          )}
        </strong>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          disabled={isToday}
          aria-label={t("dashboard.nextDay")}
          className="grid h-6 w-6 place-items-center rounded-full text-ink/60 transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="space-y-2">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-ink/40">
            {t("dashboard.loading")}
          </p>
        ) : groups.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-ink/40">
            {t("dashboard.noFoodRecordForDay")}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.value}>
              <div className="mb-1 text-[9px] font-medium">{t(g.labelKey)}</div>
              <div className="space-y-1.5">
                {g.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 rounded-xl bg-[#fbf7f1] p-2"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white">
                      {g.icon}
                    </span>
                    <div>
                      <div className="text-[12px] font-medium">
                        {item.food_name}
                      </div>
                      <div className="text-[9px] text-ink/45">
                        {item.portion_grams} g / {Math.round(item.calories)}{" "}
                        kcal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 rounded-xl bg-[#fbf7f1] p-3">
        <div className="mb-1 flex items-center justify-between text-[9px] font-medium">
          <div>
            {t("dashboard.todayIntake")}
            {totalCalories > (dailyCalories ?? 0) && (
              <span className="text-red-500"> {t("dashboard.exceeded")}</span>
            )}
          </div>
          {dailyCalories != null && (
            <span className="font-normal text-ink/45">
              {t("dashboard.suggestedCalories", { value: dailyCalories })}
            </span>
          )}
        </div>
        <div
          className={`text-center text-lg font-semibold ${totalCalories > (dailyCalories ?? 0) ? "text-red-500" : ""}`}
        >
          {Math.round(totalCalories)}
          <span className="ml-1 text-[10px] font-normal text-ink/45">kcal</span>
        </div>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const setAddFoodOpen = useAppStore((s) => s.setAddFoodOpen);
  const setAddVaccineOpen = useAppStore((s) => s.setAddVaccineOpen);
  const setAiScanOpen = useAppStore((s) => s.setAiScanOpen);
  const setEditHealthOpen = useAppStore((s) => s.setEditHealthOpen);
  const setHealthJournalOpen = useAppStore((s) => s.setHealthJournalOpen);
  const setWaterIntakeOpen = useAppStore((s) => s.setWaterIntakeOpen);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  const foodRecordRefreshKey = useAppStore((s) => s.foodRecordRefreshKey);
  const healthJournalRefreshKey = useAppStore((s) => s.healthJournalRefreshKey);
  const waterRefreshKey = useAppStore((s) => s.waterRefreshKey);
  const userInfo = useAuthStore((s) => s.userInfo);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const dailyCalories = selectedPet
    ? String(calculateDailyCalories(selectedPet) ?? "--")
    : null;
  const macros = selectedPet ? calculateMacros(selectedPet) : null;

  const [todayCalories, setTodayCalories] = useState<number | null>(null);
  const [healthScoreToday, setHealthScoreToday] = useState<number | null>(null);
  const [waterTodayMl, setWaterTodayMl] = useState<number | null>(null);

  // 「今日熱量」跟 FoodCard 抓的是同一支 API，各自獨立打一次——FoodCard
  // 內部的 selectedDate 可能被使用者切去別天，不能共用它算出來的總和，
  // 這裡固定只算今天
  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) {
      setTodayCalories(null);
      return;
    }
    const todayKey = toDateKey(new Date());
    apiFetch<FoodRecordEntry[]>(`/food/food-records/${petId}`, {
      method: "GET",
    })
      .then((records) => {
        const todayRecords = records.filter(
          (r) => toDateKey(new Date(r.fed_at)) === todayKey,
        );
        setTodayCalories(
          sumCalories(
            todayRecords.map((r) => ({ calories: r.total_calories })),
          ),
        );
      })
      .catch((err) => console.error(err));
  }, [selectedPet?.id, foodRecordRefreshKey]);

  // 「健康分數」只看今天有沒有記過健康日誌——沒有的話卡片顯示 "--"，
  // 不要拿以前的分數冒充今天的狀況
  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) {
      setHealthScoreToday(null);
      return;
    }
    const todayKey = toDateKey(new Date());
    apiFetch<HealthJournalHistoryEntry[]>(`/health-journal/history/${petId}`, {
      method: "GET",
    })
      .then((entries) => {
        const todayEntry = entries.find((e) => e.log_date === todayKey);
        setHealthScoreToday(todayEntry ? todayEntry.health_score : null);
      })
      .catch((err) => console.error(err));
  }, [selectedPet?.id, healthJournalRefreshKey]);

  // 「飲水量」百分比 = 今天累計 ml / 用體重估算的目標 ml
  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) {
      setWaterTodayMl(null);
      return;
    }
    apiFetch<WaterTodaySummary>(`/water/today/${petId}`, { method: "GET" })
      .then((res) => setWaterTodayMl(res.total_ml))
      .catch((err) => console.error(err));
  }, [selectedPet?.id, waterRefreshKey]);

  const waterTargetMl = selectedPet
    ? calculateDailyWaterTargetMl(selectedPet)
    : null;
  const waterPercent =
    waterTodayMl != null && waterTargetMl
      ? Math.min(100, Math.round((waterTodayMl / waterTargetMl) * 100))
      : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-3">
      <section className="grid gap-3 xl:grid-cols-[1.55fr_.95fr_.95fr_.95fr]">
        <div className="card p-4 xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {t("dashboard.greeting", { name: userInfo?.name })}
              </h1>
              <p className="mt-1 text-[12px] text-ink/50">
                <Trans
                  i18nKey="dashboard.greetingSubtitle"
                  values={{ name: selectedPet?.name }}
                  components={{ b: <b /> }}
                />
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_1.55fr]">
            <div className="flex items-center gap-3 rounded-xl bg-[#fbf7f1] p-3">
              <img
                src={selectedPet?.avatar ?? defaultPetAvatar}
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <div className="text-lg font-semibold mb-2">
                  {selectedPet?.name} {selectedPet?.gender === "1" ? "♀" : "♂"}
                </div>
                <div className="text-[12px]">
                  <span>{t("pets.fieldBreed")}：</span>
                  {selectedPet?.breed}
                </div>
                <div className="text-[12px] text-ink/45">
                  {" "}
                  {t("dashboard.ageWeight", {
                    age: calculateAge(selectedPet?.birthday ?? ""),
                    weight: selectedPet?.weight,
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                icon={Heart}
                title={t("dashboard.healthScore")}
                value={
                  healthScoreToday != null ? String(healthScoreToday) : "--"
                }
                unit="/100"
                tone="peach"
              />
              <Metric
                icon={Flame}
                title={t("dashboard.todayCalories")}
                value={
                  todayCalories != null
                    ? String(Math.round(todayCalories))
                    : "--"
                }
                unit={`/${dailyCalories ?? "--"} kcal`}
                tone="peach"
              />
              <button
                type="button"
                onClick={() => setWaterIntakeOpen(true)}
                className="text-left transition hover:-translate-y-0.5"
              >
                <Metric
                  icon={Droplets}
                  title={t("dashboard.waterIntake")}
                  value={waterPercent != null ? String(waterPercent) : "--"}
                  unit="%"
                />
              </button>
              <Metric
                icon={HeartPulse}
                title={t("dashboard.mood")}
                value={
                  healthScoreToday != null
                    ? t(`healthJournal.mood.${moodFromScore(healthScoreToday)}`)
                    : "--"
                }
                tone="cream"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fbf7f1] p-3">
            <div>
              <div className="text-[12px] font-semibold">
                {t("dashboard.todaySuggestionTitle")}
              </div>
              <p className="mt-1 text-[9px] text-ink/55">
                {t("dashboard.todaySuggestionText")}
              </p>
            </div>
            <img
              src={petEat}
              alt="pet-eat"
              className="w-16 h-16 object-cover"
            />
          </div>
          {/* 依每日建議熱量 + 物種（狗/貓比例不同）換算出來的建議攝取量，
              是簡化過的參考值，不是精確的個體營養需求 */}
          <div className="mt-3 rounded-xl bg-[#fbf7f1] p-3">
            <div className="mb-2 text-[12px] font-semibold">
              {t("dashboard.nutrientTitle")}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
              <div>
                <div>{t("dashboard.protein")}</div>
                <b className="text-xs">
                  {macros ? `${macros.protein} g` : "--"}
                </b>
              </div>
              <div>
                <div>{t("dashboard.fat")}</div>
                <b className="text-xs">{macros ? `${macros.fat} g` : "--"}</b>
              </div>
              <div>
                <div>{t("dashboard.carb")}</div>
                <b className="text-xs">{macros ? `${macros.carb} g` : "--"}</b>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-2 text-[12px] font-medium">
              {t("dashboard.quickAction")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  [Camera, "scan", t("dashboard.qaScan"), setAiScanOpen],
                  [Bone, "addFood", t("dashboard.qaAddFood"), setAddFoodOpen],
                  [
                    Syringe,
                    "vaccine",
                    t("dashboard.qaVaccine"),
                    setAddVaccineOpen,
                  ],
                  [
                    ClipboardPlus,
                    "checkup",
                    t("dashboard.qaCheckup"),
                    setEditHealthOpen,
                  ],
                  [
                    NotebookPen,
                    "journal",
                    t("dashboard.qaJournal"),
                    setHealthJournalOpen,
                  ],
                  [
                    History,
                    "timeline",
                    t("dashboard.qaTimeline"),
                    () => setTimelineOpen(true),
                  ],
                ] as const
              ).map(([I, id, label, action]) => (
                <button
                  key={id}
                  onClick={() => action?.(true)}
                  className="soft-card p-2 text-center hover:-translate-y-0.5"
                >
                  <I size={17} className="mx-auto text-[#7591a2]" />
                  <span className="mt-1 block text-[8px]">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* <PetProfileCard /> */}
        {/* <VaccineCard onAddVaccine={() => setAddVaccineOpen(true)} /> */}
        <FoodCard onAddFood={() => setAddFoodOpen(true)} />
      </section>
      <footer className="flex items-center justify-between rounded-xl px-5 text-[12px] text-[#78A4CB]">
        <span>{t("dashboard.footerTagline")}</span>
        <span className="hidden sm:inline">
          React · TypeScript · Tailwind · Zustand · i18n
        </span>
      </footer>
    </div>
  );
}
