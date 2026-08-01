import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export function AiScanHistoryPage() {
  const selectedPet = usePetStore((s) => s.selectedPet);
  const navigate = useNavigate();
  const setAiScanOpen = useAppStore((s) => s.setAiScanOpen);
  const [items, setItems] = useState<AiScanHistoryItem[]>([]);

  // AiScanDrawer 不是路由頁面，是疊在畫面上的 drawer，「返回」要做的是
  // 回首頁 + 重新打開那個 drawer，不是導去一個不存在的 /ai-scan 路由
  function handleBack() {
    setAiScanOpen(true);
    navigate("/");
  }

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) return;
    apiFetch<AiScanHistoryItem[]>(`/ai-scan/history/${petId}`, {
      method: "GET",
    })
      .then(setItems)
      .catch((error) => console.error(error));
  }, [selectedPet?.id]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
