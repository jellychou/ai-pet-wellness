import { useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

const defaultEarPhoto =
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=440&fit=crop";

const results = [
  ["80%", "耳道感染"],
  ["15%", "正常耳垢"],
  ["5%", "其他情況"],
];

export function AiScanDrawer() {
  const open = useAppStore((s) => s.aiScanOpen);
  const setOpen = useAppStore((s) => s.setAiScanOpen);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [earPhoto, setEarPhoto] = useState(defaultEarPhoto);
  const [analyzing, setAnalyzing] = useState(false);

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  function handleReupload() {
    fileInputRef.current?.click();
  }

  function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setEarPhoto(url);
    setAnalyzing(true);
    window.setTimeout(() => setAnalyzing(false), 900);
    e.target.value = "";
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
            <h1 className="text-base font-semibold text-ink">
              AI 拍照診斷室 / AI Diagnosis
            </h1>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoPick}
          />
          <div className="relative">
            <img
              src={earPhoto}
              alt="寵物拍照診斷照片"
              className="h-56 w-full rounded-2xl object-cover"
            />
            {analyzing && (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-sm font-medium text-white">
                AI 判讀中…
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
            <div className="text-xs text-ink/45">AI 判讀結果</div>
            <div className="mt-3 space-y-3">
              {results.map(([percent, label]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink/80">{label}</span>
                    <span className="font-semibold text-ink">{percent}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eee5da]">
                    <div
                      className="h-full rounded-full bg-mist"
                      style={{ width: percent }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#fff3e5] p-4 text-xs leading-5">
            <span className="font-semibold text-[#d9834f]">
              ⚠ 本診斷僅供參考。
            </span>
            <br />
            若持續惡化請尋求專業獸醫協助。
          </div>
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleReupload}
            className="rounded-2xl border border-mist py-3.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10"
          >
            重新上傳
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-2xl bg-mist py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(120,150,166,.35)] transition hover:opacity-90"
          >
            詢問 AI 助理
          </button>
        </div>
      </div>
    </div>
  );
}
