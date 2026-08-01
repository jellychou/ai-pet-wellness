import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";

type AiScanFinding = {
  condition: string;
  confidence: number;
  description: string;
};

type AiScanHistoryItem = {
  id: number;
  pet_id: number;
  image_url: string;
  summary: string;
  findings: AiScanFinding[] | null;
  suggestions: string[] | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 疊在 AiScanDrawer 上面的第二層 drawer（z-[60] > AiScanDrawer 的 z-50），
// 跟 HealthDetailDrawer 疊在 EditHealthDrawer 上面是同一個模式：點「返回」
// 只關掉自己，底下的 AiScanDrawer 本來就還開著，不用特別處理
export function AiScanHistoryDrawer() {
  const open = useAppStore((s) => s.aiScanHistoryOpen);
  const setOpen = useAppStore((s) => s.setAiScanHistoryOpen);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<AiScanHistoryItem[]>([]);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    apiFetch<AiScanHistoryItem[]>(`/ai-scan/history/${petId}`, {
      method: "GET",
    })
      .then(setItems)
      .catch((error) => console.error(error));
  }, [open, selectedPet?.id]);

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
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="返回 AI 拍照診斷室"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">AI 診斷記錄</h1>
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {selectedPet?.name ?? "這隻寵物"} 還沒有 AI 診斷記錄
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3"
                >
                  <img
                    src={item.image_url}
                    alt="診斷照片"
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-ink/40">
                      {formatDateTime(item.created_at)}
                    </div>
                    <p className="mt-1 text-sm text-ink/80">{item.summary}</p>
                    {item.findings && item.findings.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.findings.map((f) => (
                          <span
                            key={f.condition}
                            className="rounded-full bg-[#eef4f6] px-2 py-0.5 text-[10px] font-medium text-[#688696]"
                          >
                            {f.condition} {f.confidence}%
                          </span>
                        ))}
                      </div>
                    )}
                    {item.suggestions && item.suggestions.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {item.suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="flex gap-1 text-[11px] text-ink/45"
                          >
                            <span className="text-mist">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
