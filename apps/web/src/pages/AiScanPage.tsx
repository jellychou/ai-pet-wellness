import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";

const defaultEarPhoto =
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=440&fit=crop";

type AiScanFinding = {
  condition: string;
  confidence: number;
  description: string;
};

type AiScanUsage = {
  used: number;
  limit: number;
};

type AnalyzeImageResponse = {
  summary: string;
  findings: AiScanFinding[];
  disclaimer: string;
  usage: AiScanUsage;
};

export function AiScanPage() {
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError } = useAlert();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [earPhoto, setEarPhoto] = useState(defaultEarPhoto);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeImageResponse | null>(null);
  const [usage, setUsage] = useState<AiScanUsage | null>(null);

  // 進頁面就先問今天用了幾次，這樣按「重新上傳」之前就能看到標語、
  // 額度用完也能直接擋下來，不用浪費一次 Cloudinary 上傳才發現被拒絕
  useEffect(() => {
    apiFetch<AiScanUsage>("/ai-scan/usage-today", { method: "GET" })
      .then(setUsage)
      .catch((error) => console.error(error));
  }, []);

  const limitReached = usage !== null && usage.used >= usage.limit;

  function handleReupload() {
    if (limitReached) {
      showError(
        `今天的 AI 診斷次數已用完（每天最多 ${usage?.limit} 次），請明天再試`,
      );
      return;
    }
    fileInputRef.current?.click();
  }

  async function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!selectedPet) {
      showError("請先選擇寵物");
      return;
    }

    // 先本地預覽，不用等上傳完成才看得到剛選的照片
    const previewUrl = URL.createObjectURL(file);
    setEarPhoto(previewUrl);
    setResult(null);
    setAnalyzing(true);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      const response = await apiFetch<AnalyzeImageResponse>(
        "/ai-scan/analyze-image",
        {
          method: "POST",
          body: JSON.stringify({
            pet_id: selectedPet.id,
            image_url: imageUrl,
          }),
        },
      );
      setResult(response);
      setUsage(response.usage);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "AI 分析失敗，請稍後再試",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">
          AI 拍照診斷室 / AI Diagnosis
        </h1>
      </div>

      {usage && (
        <div
          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
            limitReached
              ? "bg-[#fbe4de] text-[#c9503f]"
              : "bg-[#eef4f6] text-[#688696]"
          }`}
        >
          今日已使用 {usage.used} / {usage.limit} 次
          {limitReached && "，請明天再試"}
        </div>
      )}

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

      {result && (
        <>
          <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
            <div className="text-xs text-ink/45">AI 判讀結果</div>
            {result.summary && (
              <p className="mt-2 text-sm text-ink/80">{result.summary}</p>
            )}
            {result.findings.length > 0 ? (
              <div className="mt-3 space-y-3">
                {result.findings.map((finding) => (
                  <div key={finding.condition}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink/80">{finding.condition}</span>
                      <span className="font-semibold text-ink">
                        {finding.confidence}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eee5da]">
                      <div
                        className="h-full rounded-full bg-mist"
                        style={{ width: `${finding.confidence}%` }}
                      />
                    </div>
                    {finding.description && (
                      <p className="mt-1 text-xs text-ink/50">
                        {finding.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink/60">沒有觀察到明顯異常。</p>
            )}
          </div>

          <div className="rounded-2xl bg-[#fff3e5] p-4 text-xs leading-5">
            <span className="font-semibold text-[#d9834f]">
              ⚠ {result.disclaimer}
            </span>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={handleReupload}
          disabled={limitReached || analyzing}
          className="rounded-2xl border border-mist py-3.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          重新上傳
        </button>
        <button
          type="button"
          onClick={() => navigate("/ai")}
          className="rounded-2xl bg-mist py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(120,150,166,.35)] transition hover:opacity-90"
        >
          詢問 AI 助理
        </button>
      </div>
    </div>
  );
}
