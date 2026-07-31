import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { healthRecords } from "../data/healthRecords";

export function EditHealthDrawer() {
  const open = useAppStore((s) => s.editHealthOpen);
  const setOpen = useAppStore((s) => s.setEditHealthOpen);
  const setHealthDetailIndex = useAppStore((s) => s.setHealthDetailIndex);
  const setAddHealthRecordOpen = useAppStore((s) => s.setAddHealthRecordOpen);
  const navigate = useNavigate();

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

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
            <h1 className="text-base font-semibold text-ink">健康檢查紀錄</h1>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#fbe9dc] p-4">
            <div>
              <div className="text-xs text-ink/50">最新檢查</div>
              <div className="mt-1 text-xl font-bold text-ink">
                2025 / 05 / 10
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-ink/60">身體狀況</span>
                <span className="pill bg-[#dff3e6] font-medium text-[#3fa876]">
                  良好
                </span>
              </div>
            </div>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#f6d9c2] text-[#d9834f]">
              <ClipboardCheck size={30} />
            </span>
          </div>

          <div className="space-y-3">
            {healthRecords.map((r, i) => (
              <button
                key={r.date}
                type="button"
                onClick={() => setHealthDetailIndex(i)}
                className="flex w-full items-start gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-left transition hover:bg-[#f6f0e8]"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${r.color}`}
                >
                  <ClipboardList size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs text-ink/35">
                    <span>{r.date}</span>
                    <ChevronRight size={14} />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {r.title}
                  </div>
                  <div className="mt-1 text-xs text-ink/60">
                    體重 {r.weight}
                  </div>
                  <div className="text-xs text-ink/60">醫院 {r.hospital}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAddHealthRecordOpen(true)}
            className="w-full rounded-2xl bg-[#f3e6d6] py-2.5 text-sm font-semibold text-ink transition hover:bg-[#ecdcc7]"
          >
            新增健康檢查紀錄
          </button>
        </div>
      </div>
    </div>
  );
}
