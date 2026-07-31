import {
  Bone,
  Camera,
  ClipboardPlus,
  Droplets,
  Flame,
  Heart,
  HeartPulse,
  MessageCircleHeart,
  Syringe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

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

function VaccineCard({ onAddVaccine }: { onAddVaccine: () => void }) {
  const vaccines = [
    ["狂犬病疫苗", "Rabies", "2026/05/02", "已施打"],
    ["DHPP 五合一疫苗", "DHPP", "2025/10/10", "已施打"],
    ["鉤端螺旋體疫苗", "Leptospirosis", "2026/06/15", "待施打"],
  ];
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">疫苗記錄 / Vaccine</h2>
      </div>
      <div className="mb-3 flex gap-6 border-b border-[#ece4dc] text-[12px]">
        <span className="border-b-2 border-[#7693a5] pb-2">全部</span>
        <span>已接種</span>
        <span>待接種</span>
      </div>
      <div className="space-y-2">
        {vaccines.map((v, i) => (
          <div
            key={v[0]}
            className="flex items-center gap-3 rounded-xl bg-[#fbf7f1] p-3"
          >
            <Syringe
              size={24}
              className={i === 2 ? "text-[#e78154]" : "text-[#8083c9]"}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold">{v[0]}</div>
              <div className="text-[9px] text-ink/45">{v[1]}</div>
              <div className="mt-1 text-[9px]">{v[2]}</div>
            </div>
            <span
              className={`pill ${i === 2 ? "bg-[#f4ddc3] text-[#a46e3d]" : "bg-[#dce8ed] text-[#5d7c8c]"}`}
            >
              {v[3]}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onAddVaccine}
        className="mt-3 w-full rounded-xl bg-[#b88672] py-2 text-xs text-white"
      >
        ＋ 新增疫苗
      </button>
    </section>
  );
}

function FoodCard({ onAddFood }: { onAddFood: () => void }) {
  const meals = [
    ["早餐", "雞胸肉 Chicken Breast", "120 g / 198 kcal", "🍗"],
    ["午餐", "Royal Canin 飼料", "100 g / 380 kcal", "🥣"],
    ["晚餐", "鮭魚 Salmon", "150 g / 285 kcal", "🍣"],
    ["點心", "蘋果 Apple", "50 g / 26 kcal", "🍏"],
  ];
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">飲食記錄 / Food Record</h2>
      </div>
      <div className="mb-3 flex items-center justify-between text-[12px]">
        <span>‹</span>
        <strong>2025 / 05 / 20</strong>
        <span>›</span>
      </div>
      <div className="space-y-2">
        {meals.map((m) => (
          <div key={m[0]}>
            <div className="mb-1 text-[9px] font-medium">{m[0]}</div>
            <div className="flex items-center gap-2 rounded-xl bg-[#fbf7f1] p-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white">
                {m[3]}
              </span>
              <div>
                <div className="text-[12px] font-medium">{m[1]}</div>
                <div className="text-[9px] text-ink/45">{m[2]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-[#fbf7f1] p-3">
        <div className="mb-2 text-[9px] font-medium">營養總計</div>
        <div className="grid grid-cols-4 text-center text-[9px]">
          {[
            ["熱量", "889 kcal"],
            ["蛋白質", "66 g"],
            ["脂肪", "32 g"],
            ["碳水", "80 g"],
          ].map((x) => (
            <div key={x[0]}>
              <div>{x[0]}</div>
              <b>{x[1]}</b>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onAddFood}
        className="mt-3 w-full rounded-xl bg-[#b88672] text-white py-2 text-xs"
      >
        ＋ 新增飲食
      </button>
    </section>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const setAddFoodOpen = useAppStore((s) => s.setAddFoodOpen);
  const setAddVaccineOpen = useAppStore((s) => s.setAddVaccineOpen);
  const setAiScanOpen = useAppStore((s) => s.setAiScanOpen);
  const setEditHealthOpen = useAppStore((s) => s.setEditHealthOpen);
  const userInfo = useAuthStore((s) => s.userInfo);
  const selectedPet = usePetStore((s) => s.selectedPet);

  return (
    <div className="mx-auto max-w-[1500px] space-y-3">
      <section className="grid gap-3 xl:grid-cols-[1.55fr_.95fr_.95fr_.95fr]">
        <div className="card p-4 xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                Hello {userInfo?.name} 👋
              </h1>
              <p className="mt-1 text-[12px] text-ink/50">
                今天也要和 <b>{selectedPet?.name}</b> 一起健康生活！
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_1.55fr]">
            <div className="flex items-center gap-3 rounded-xl bg-[#fbf7f1] p-3">
              <img
                src={selectedPet?.avatar ?? defaultPetPhoto}
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <div className="text-lg font-semibold mb-2">
                  {selectedPet?.name} {selectedPet?.gender === "1" ? "♀" : "♂"}
                </div>
                <div className="text-[12px]">{selectedPet?.breed}</div>
                <div className="text-[12px] text-ink/45">
                  {" "}
                  {calculateAge(selectedPet?.birthday ?? "")} 歲 /{" "}
                  {selectedPet?.weight} kg
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                icon={Heart}
                title="健康分數"
                value="92"
                unit="/100"
                tone="peach"
              />
              <Metric
                icon={Flame}
                title="今日熱量"
                value="430"
                unit="/500 kcal"
                tone="peach"
              />
              <Metric icon={Droplets} title="喝水量" value="80" unit="%" />
              <Metric
                icon={HeartPulse}
                title="心情狀態"
                value="Happy"
                tone="cream"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fbf7f1] p-3">
            <div>
              <div className="text-[12px] font-semibold">今日建議</div>
              <p className="mt-1 text-[9px] text-ink/55">
                今天可以增加一點優質蛋白質，幫助毛孩健康！
              </p>
            </div>
            <span className="text-3xl">🐕🥣</span>
          </div>
          <div className="mt-3">
            <div className="mb-2 text-[12px] font-medium">Quick Action</div>
            <div className="grid grid-cols-5 gap-2">
              {[
                [Camera, "AI 拍照診斷"],
                [Bone, "新增飲食"],
                [Syringe, "疫苗記錄"],
                [ClipboardPlus, "健康檢查"],
                [MessageCircleHeart, "AI 心靈導師"],
              ].map(([I, x]) => (
                <button
                  key={x as string}
                  onClick={() => {
                    if (x === "新增飲食") setAddFoodOpen(true);
                    if (x === "疫苗記錄") setAddVaccineOpen(true);
                    if (x === "AI 拍照診斷") setAiScanOpen(true);
                    if (x === "健康檢查") setEditHealthOpen(true);
                  }}
                  className="soft-card p-2 text-center hover:-translate-y-0.5"
                >
                  <I size={17} className="mx-auto text-[#7591a2]" />
                  <span className="mt-1 block text-[8px]">{x as string}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* <PetProfileCard /> */}
        <VaccineCard onAddVaccine={() => setAddVaccineOpen(true)} />
        <FoodCard onAddFood={() => setAddFoodOpen(true)} />
      </section>
      <footer className="flex items-center justify-between rounded-xl px-5 py-2 text-[12px] text-[#78A4CB]">
        <span>🐾 Food・Heart・Vaccine — 陪伴毛孩，也陪伴你 ♡</span>
        <span className="hidden sm:inline">
          React · TypeScript · Tailwind · Zustand · i18n
        </span>
      </footer>
    </div>
  );
}
