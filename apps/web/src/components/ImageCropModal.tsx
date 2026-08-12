import { useRef, useState, type SyntheticEvent } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  cropToCanvas,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ImageCropModalProps = {
  open: boolean;
  // 要裁切的圖片來源——呼叫端負責 URL.createObjectURL(file)，這個元件
  // 不管檔案怎麼來的，只認一個字串網址
  imageSrc: string | null;
  // 給 1 表示固定 1:1 正方形（頭像用），不給就是自由裁切（不鎖比例），
  // 讓使用者自己拖曳調整框的形狀——AI 診斷照/飲食照/健康日誌照都是這種
  aspect?: number;
  // 裁切完成後要包成 File 用的檔名/型別，預設值給一般情況就夠用，
  // 呼叫端如果想保留原檔名可以自己傳
  fileName?: string;
  mimeType?: string;
  onCancel: () => void;
  // 裁切完成，回傳裁切後的 File——呼叫端接手後續（本地預覽/直接上傳都行，
  // 這個元件不負責上傳，只負責「裁切」這一步）
  onConfirm: (file: File) => void;
  // 讓使用者可以跳過裁切、直接用原圖——AI 診斷/分析類的照片有可能裁切後
  // 反而漏掉 AI 需要判斷的畫面內容，保留一個「不裁切」的退路，不是每個
  // 情境都強制要裁
  onUseOriginal?: () => void;
};

// 給一個初始的裁切框：有固定比例就置中裁一個比較大的範圍，沒有比例限制
// 就直接給畫面中間 90% 的自由框，使用者自己再拖曳調整
function buildInitialCrop(
  width: number,
  height: number,
  aspect?: number,
): Crop {
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
      width,
      height,
    );
  }
  return { unit: "%", x: 5, y: 5, width: 90, height: 90 };
}

export function ImageCropModal({
  open,
  imageSrc,
  aspect,
  fileName = "cropped.jpg",
  mimeType = "image/jpeg",
  onCancel,
  onConfirm,
  onUseOriginal,
}: ImageCropModalProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);

  function handleImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(buildInitialCrop(width, height, aspect));
  }

  async function handleConfirm() {
    const image = imgRef.current;
    // 沒有框選範圍（例如圖片還沒載入完成就按確認）就當作沒裁切，直接退回
    // 用原圖，不要卡住整個流程
    if (!image || !completedCrop || completedCrop.width < 1) {
      onUseOriginal?.();
      return;
    }
    setProcessing(true);
    try {
      const canvas = document.createElement("canvas");
      // cropToCanvas 是 react-image-crop 自己提供的工具函式，會處理好
      // 顯示尺寸跟原始圖片實際尺寸之間的縮放比例，不用自己重算 scaleX/scaleY
      await cropToCanvas(image, canvas, completedCrop);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, 0.92),
      );
      if (!blob) {
        onUseOriginal?.();
        return;
      }
      onConfirm(new File([blob], fileName, { type: mimeType }));
    } finally {
      setProcessing(false);
    }
  }

  if (!open || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/85"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-3 py-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("common.cancel")}
          className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10"
        >
          <X size={20} />
        </button>
        <span className="text-sm font-semibold text-white">
          {t("imageCrop.title")}
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#8ca4b3] transition disabled:opacity-50"
        >
          {processing ? t("imageCrop.processing") : t("common.confirm")}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-3">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
          aspect={aspect}
          className="max-h-full"
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            ref={imgRef}
            src={imageSrc}
            onLoad={handleImageLoad}
            className="max-h-[65vh] w-auto"
          />
        </ReactCrop>
      </div>

      <div className="space-y-3 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
        <p className="text-center text-xs text-white/50">
          {t("imageCrop.hint")}
        </p>
        {onUseOriginal && (
          <button
            type="button"
            onClick={onUseOriginal}
            className="w-full rounded-2xl border border-white/20 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            {t("imageCrop.skipButton")}
          </button>
        )}
      </div>
    </div>
  );
}
