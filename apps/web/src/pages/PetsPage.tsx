import { useAppStore } from "../store/useAppStore";

const petPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

export function PetsPage() {
  const setEditPetOpen = useAppStore((s) => s.setEditPetOpen);
  const rows = [
    ["名字", "Coco"],
    ["品種", "Golden Retriever"],
    ["性別", "Female"],
    ["生日", "2020/05/20（4 歲）"],
    ["體重", "25.4 kg"],
    ["毛色", "Golden"],
    ["絕育狀態", "已絕育"],
    ["晶片號碼", "900215000123456"],
    ["過敏", "雞肉、牛肉"],
    ["運動量", "中等"],
  ];
  return (
    <>
      <section className="card p-4 mb-[12px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">寵物資訊 / Pet Profile</h2>
        </div>
        <div className="mb-3 flex justify-center">
          <div className="relative">
            <img
              src={petPhoto}
              className="h-20 w-20 rounded-full object-cover"
            />
          </div>
        </div>
        <div className="divide-y divide-[#eee7df]">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-[86px_1fr] py-1.5 text-[12px]"
            >
              <span className="font-medium">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setEditPetOpen(true)}
          className="mt-3 w-full rounded-xl bg-[#b88672] py-2 text-xs font-medium text-white"
        >
          編輯資訊
        </button>
      </section>
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">熱量建議 / Calorie Advisor</h2>
        </div>
        <div className="flex items-center gap-3">
          <img src={petPhoto} className="h-12 w-12 rounded-full object-cover" />
          <div>
            <b className="text-xs">Coco</b>
            <div className="text-[12px] text-ink/45">
              Golden Retriever
              <br />4 歲 / 25.4 kg
            </div>
          </div>
        </div>
        <div className="relative mx-auto mt-4 h-28 w-28 overflow-hidden rounded-full border-[12px] border-[#edf0ee] border-r-mist border-t-mist">
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-[9px]">建議每日熱量</div>
              <b className="text-xl">520</b>
              <span className="text-[9px]"> kcal</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[12px]">
          <div className="rounded-xl bg-[#fbf7f1] p-2">
            已攝取
            <br />
            <b>430 kcal</b>
          </div>
          <div className="rounded-xl bg-[#fbf7f1] p-2">
            還可攝取
            <br />
            <b>90 kcal</b>
          </div>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-[12px]">
          <li>增加優質蛋白質</li>
          <li>減少加工食品</li>
          <li>多攝取 Omega-3</li>
        </ul>
      </section>
    </>
  );
}
