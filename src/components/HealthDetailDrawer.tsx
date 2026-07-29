import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { healthRecords } from "../data/healthRecords";

export function HealthDetailDrawer() {
  const index = useAppStore((s) => s.healthDetailIndex);
  const setIndex = useAppStore((s) => s.setHealthDetailIndex);
  const open = index !== null;
  const record = index !== null ? healthRecords[index] : null;

  function handleBack() {
    setIndex(null);
  }

  const rows = record
    ? [
        ["體重", record.weight],
        ["體溫", record.temp],
        ["心跳", record.heartRate],
        ["血液檢查", record.bloodTest],
        ["醫院", record.hospital],
        ["醫師", record.doctor],
        ["備註", record.note],
      ]
    : [];

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              aria-label="返回"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">檢查詳情</h1>
          </div>

          {record && (
            <>
              <div>
                <div className="text-sm text-ink/45">{record.date}</div>
                <div className="mt-1 text-lg font-bold text-ink">
                  {record.title}
                </div>
              </div>

              <div className="divide-y divide-[#eee5da] rounded-2xl border border-[#ece0d2] bg-[#fffdfa] px-4">
                {rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 py-3 text-sm"
                  >
                    <span className="shrink-0 text-ink/45">{label}</span>
                    <span className="text-right text-ink">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-sm font-semibold text-ink">
                  上傳檢驗報告 / 圖片
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {record.attachments.map((a) => (
                    <div
                      key={a.name}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className={`grid aspect-square w-full place-items-center rounded-2xl ${
                          a.type === "pdf"
                            ? "bg-[#fdeceb] text-[#d9645a]"
                            : "bg-[#dce8f5] text-[#5b83ab]"
                        }`}
                      >
                        {a.type === "pdf" ? (
                          <FileText size={26} />
                        ) : (
                          <ImageIcon size={26} />
                        )}
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-ink/60">
                        {a.name}
                      </span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#dcccb8] text-ink/40 transition hover:bg-cream/40"
                  >
                    <Plus size={20} />
                    <span className="text-[10px]">新增檔案</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
