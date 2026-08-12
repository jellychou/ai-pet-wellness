import { useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Trash2,
  X,
} from "lucide-react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import { useAlert } from "../hooks/useAlert";

type Attachment = {
  name: string;
  type: "pdf" | "image";
  url?: string;
};

// 從 Cloudinary 網址推斷這個附件要顯示成圖片還是 PDF 縮圖；PDF 一樣保留
// url，點下去會用 iframe 直接在彈窗裡顯示（瀏覽器內建的 PDF 檢視器）
function attachmentFromUrl(url: string): Attachment {
  const name = url.split("/").pop() ?? url;
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return {
    name,
    type: isPdf ? "pdf" : "image",
    url,
  };
}

export function HealthDetailDrawer() {
  const { t } = useTranslation();
  const formatReportType = (type: string) =>
    t(`health.reportType.${type}`, { defaultValue: type });
  // 存的是整筆紀錄（不是 id）——後端沒有「用 id 查單筆」的 API，列表那邊
  // 本來就已經抓過完整資料了，點下去直接把那筆傳過來，這裡不用再打一次 API
  const record = useAppStore((s) => s.healthDetailRecord);
  const setRecord = useAppStore((s) => s.setHealthDetailRecord);
  const bumpHealthRecordRefreshKey = useAppStore(
    (s) => s.bumpHealthRecordRefreshKey,
  );
  const open = record !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 使用者在詳情頁另外選的檔案，目前只是本機預覽用（還沒有串上傳/儲存），
  // 用 record.id 當 key，切換不同紀錄時不會互相干擾
  const [extraAttachments, setExtraAttachments] = useState<
    Record<number, Attachment[]>
  >({});
  // 點到附件時要放大顯示的那一個，圖片跟 PDF 都共用同一個彈窗
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null,
  );

  function handleBack() {
    setRecord(null);
  }

  async function handleDelete() {
    if (!record) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/report/delete-report-record/${record.id}`, {
        method: "DELETE",
      });
      showSuccess(t("health.deleteSuccess"));
      bumpHealthRecordRefreshKey();
      setConfirmOpen(false);
      setRecord(null);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : t("health.deleteFailed"),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleFilesPick(e: ChangeEvent<HTMLInputElement>) {
    if (!record) return;
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const added: Attachment[] = picked.map((file) => ({
      name: file.name,
      type: file.type === "application/pdf" ? "pdf" : "image",
      url: URL.createObjectURL(file),
    }));
    setExtraAttachments((prev) => ({
      ...prev,
      [record.id]: [...(prev[record.id] ?? []), ...added],
    }));
    e.target.value = "";
  }

  function handleAttachmentClick(attachment: Attachment) {
    if (!attachment.url) return;
    if (attachment.type === "pdf") {
      // PDF 開新分頁讓瀏覽器用完整版的原生檢視器渲染，比塞進 iframe 可靠——
      // 尤其手機版 Safari，iframe 常常直接顯示空白或觸發下載而不是預覽
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewAttachment(attachment);
  }

  const allAttachments = record
    ? [
        ...record.report_files.map(attachmentFromUrl),
        ...(extraAttachments[record.id] ?? []),
      ]
    : [];

  const rows = record
    ? [
        [t("health.fieldWeight"), `${record.report_weight} kg`],
        [
          t("health.fieldTemperature"),
          record.report_temperature != null
            ? `${record.report_temperature} °C`
            : "—",
        ],
        [
          t("health.fieldHeartRate"),
          record.report_heart_rate != null
            ? `${record.report_heart_rate} bpm`
            : "—",
        ],
        [t("health.fieldHospital"), record.report_hospital],
        [t("health.fieldVet"), record.report_vet],
        [t("health.fieldNote"), record.report_note || "—"],
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
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mx-auto max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              aria-label={t("common.backAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              {t("health.detailTitle")}
            </h1>
            <span className="w-9" />
          </div>

          {record && (
            <>
              <div>
                <div className="text-sm text-ink/45">{record.report_date}</div>
                <div className="mt-1 text-lg font-bold text-ink">
                  {formatReportType(record.report_type)}
                </div>
              </div>

              <div className="divide-y divide-[#eee5da] rounded-2xl border border-[#ece0d2] bg-[#fffdfa] px-3">
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
                  {t("health.attachmentsTitle")}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFilesPick}
                />
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {allAttachments.map((a, i) => (
                    <button
                      type="button"
                      key={`${a.name}-${i}`}
                      onClick={() => handleAttachmentClick(a)}
                      className="flex flex-col items-center gap-2 text-left"
                    >
                      {a.type === "image" && a.url ? (
                        <img
                          src={a.url}
                          alt={a.name}
                          className="aspect-square w-full rounded-2xl object-cover transition hover:opacity-90"
                        />
                      ) : (
                        <div
                          className={`grid aspect-square w-full place-items-center rounded-2xl transition hover:opacity-90 ${
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
                      )}
                      <span className="w-full truncate text-center text-[10px] text-ink/60">
                        {a.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {record && (
        <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbe4de] py-2.5 text-sm font-semibold text-[#c9503f] transition hover:bg-[#f6d5cd] disabled:opacity-60"
            >
              <Trash2 size={16} />
              {isDeleting
                ? t("common.deleting")
                : t("health.deleteRecordButton")}
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => !isDeleting && setConfirmOpen(false)}
        aria-labelledby="delete-record-title"
      >
        <DialogTitle id="delete-record-title">
          {t("health.deleteDialogTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t("health.deleteDialogText")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleDelete} color="error" disabled={isDeleting}>
            {isDeleting ? t("common.deleting") : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {previewAttachment && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewAttachment(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewAttachment(null)}
            aria-label={t("common.close")}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>

          {/* PDF 不會走到這裡——點 PDF 是直接開新分頁，這個彈窗只放大顯示圖片 */}
          <img
            src={previewAttachment.url}
            alt={previewAttachment.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
