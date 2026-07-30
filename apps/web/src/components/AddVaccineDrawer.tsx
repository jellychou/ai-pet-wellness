import { useState } from "react";
import { ArrowLeft, Syringe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

const tabs = ["全部", "已接種", "待接種"] as const;

const vaccines = [
  {
    name: "狂犬病疫苗",
    en: "Rabies",
    date: "2026/05/02",
    next: "2027/05/02",
    status: "已接種" as const,
  },
  {
    name: "DHPP 五合一疫苗",
    en: "DHPP",
    date: "2025/10/10",
    next: "2026/10/10",
    status: "已接種" as const,
  },
  {
    name: "鉤端螺旋體疫苗",
    en: "Leptospirosis",
    date: "2026/06/15",
    next: null,
    status: "待接種" as const,
  },
];

export function AddVaccineDrawer() {
  const open = useAppStore((s) => s.addVaccineOpen);
  const setOpen = useAppStore((s) => s.setAddVaccineOpen);
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]>("全部");

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  const filtered = vaccines.filter((v) => tab === "全部" || v.status === tab);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              aria-label="返回首頁"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              疫苗記錄 / Vaccine
            </h1>
          </div>

          <div className="flex gap-6 border-b border-[#ece4dc] text-sm">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`pb-2 transition ${
                  tab === t
                    ? "border-b-2 border-[#5b83ab] font-medium text-ink"
                    : "text-ink/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((v) => (
              <div key={v.name} className="rounded-2xl bg-[#FDF0D5] p-4">
                <div className="flex items-start gap-3">
                  <Syringe
                    size={22}
                    className={
                      v.status === "待接種"
                        ? "mt-0.5 shrink-0 text-[#e78154]"
                        : "mt-0.5 shrink-0 text-[#8083c9]"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-ink">
                        {v.name}
                      </div>
                      <span
                        className={`pill shrink-0 ${
                          v.status === "待接種"
                            ? "bg-[#f4ddc3] text-[#a46e3d]"
                            : "bg-[#dce8ed] text-[#5d7c8c]"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className="text-xs text-ink/45">{v.en}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
                      <span>{v.date}</span>
                      {v.next && <span>下次接種 {v.next}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            className="w-full rounded-2xl bg-[#ead3ba] py-3.5 text-sm font-semibold text-ink transition hover:bg-[#e4c6a5]"
          >
            ＋ 新增疫苗
          </button>
        </div>
      </div>
    </div>
  );
}
