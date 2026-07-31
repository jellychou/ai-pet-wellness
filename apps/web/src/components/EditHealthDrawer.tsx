import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { HealthRecord } from "../data/pets";
import { apiFetch } from "../lib/api";
import { usePetStore } from "../store/usePetStore";
import { ReportTypeEnum } from "../data/pets";

export function EditHealthDrawer() {
  const open = useAppStore((s) => s.editHealthOpen);
  const setOpen = useAppStore((s) => s.setEditHealthOpen);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const setHealthDetailRecord = useAppStore((s) => s.setHealthDetailRecord);
  const setAddHealthRecordOpen = useAppStore((s) => s.setAddHealthRecordOpen);
  const navigate = useNavigate();
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  const fetchHealthRecords = async () => {
    const petId = selectedPet?.id;
    if (!petId) return;
    try {
      const response = await apiFetch<HealthRecord[]>(
        `/report/report-records/${petId}`,
        { method: "GET" },
      );
      setHealthRecords(response);
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  };

  const formatReportType = (type: string) => {
    return ReportTypeEnum[type as keyof typeof ReportTypeEnum];
  };

  useEffect(() => {
    fetchHealthRecords();
  }, [selectedPet?.id]);

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
                key={r.id}
                type="button"
                onClick={() => setHealthDetailRecord(r)}
                className="flex w-full items-start gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-left transition hover:bg-[#f6f0e8]"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6d9c2] text-[#d9834f]`}
                >
                  <ClipboardList size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs text-ink/35">
                    <span>{r.report_date}</span>
                    <ChevronRight size={14} />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {formatReportType(r.report_type)}
                  </div>
                  <div className="mt-1 text-xs text-ink/60">
                    體重 {r.report_weight} kg
                  </div>
                  <div className="mt-1 text-xs text-ink/60">
                    醫院 {r.report_hospital}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md flex gap-4">
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
