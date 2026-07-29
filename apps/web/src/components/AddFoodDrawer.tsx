import { useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Flag,
  Heart,
  MoreVertical,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

const defaultScanPhoto =
  "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop";

export function AddFoodDrawer() {
  const open = useAppStore((s) => s.addFoodOpen);
  const setOpen = useAppStore((s) => s.setAddFoodOpen);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanPhoto, setScanPhoto] = useState(defaultScanPhoto);
  const [analyzing, setAnalyzing] = useState(false);

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  function handleAdd() {
    handleBack();
  }

  function handleRetake() {
    fileInputRef.current?.click();
  }

  function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setScanPhoto(url);
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
              AI 食物辨別 / Food Scan
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
              src={scanPhoto}
              alt="掃描食物照片"
              className="h-56 w-full rounded-2xl object-cover"
            />
            {analyzing && (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-sm font-medium text-white">
                AI 辨識中…
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
            <div className="flex items-start justify-between">
              <div className="text-xs text-ink/45">AI 辨識結果</div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fbe3d6] text-[#e0793f]">
                <Heart size={16} fill="currentColor" />
              </span>
            </div>
            <div className="mt-1 text-base font-semibold text-ink">
              雞胸肉 Chicken Breast
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-ink">280</span>
                <span className="text-sm text-ink/50">kcal</span>
              </div>
              <div className="flex items-center gap-2 text-ink/35">
                <Flag size={16} className="text-[#5b83ab]" />
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="my-4 h-px bg-[#eee5da]" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/50">安全等級</span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-[#3fa88f]">Safe</span>
                <span className="flex text-[#3fa88f]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  ))}
                </span>
              </span>
            </div>

            <div className="my-4 h-px bg-[#eee5da]" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/50">適合寵物</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-ink/80">
                  <Check size={14} className="text-[#3fa88f]" />
                  狗狗
                </span>
                <span className="flex items-center gap-1 text-ink/80">
                  <Check size={14} className="text-[#3fa88f]" />
                  貓咪
                </span>
              </span>
            </div>

            <div className="my-4 h-px bg-[#eee5da]" />

            <div>
              <div className="text-xs text-ink/50">建議</div>
              <p className="mt-1 text-sm leading-6 text-ink/80">
                可以搭配蔬菜一起餵食，營養更均衡！
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleRetake}
            className="rounded-2xl bg-[#f1e6d8] py-3.5 text-sm font-semibold text-ink transition hover:bg-[#ecdcc9]"
          >
            重新拍攝
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d]"
          >
            加入飲食記錄
          </button>
        </div>
      </div>
    </div>
  );
}
