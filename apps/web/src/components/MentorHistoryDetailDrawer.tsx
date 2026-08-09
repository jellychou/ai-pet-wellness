import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { useAuthStore } from "../store/useAuthStore";
import { apiFetch } from "../lib/api";

const petAvatarFallback =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop";
const userAvatarFallback =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop";

type MentorHistoryMessage = {
  role: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

type MentorSessionDetail = {
  id: number;
  pet_id: number;
  is_finished: boolean;
  summary_sections: string[] | null;
  created_at: string;
  messages: MentorHistoryMessage[];
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 疊在 MentorHistoryDrawer 列表上面的第二層 drawer（z-[70] > 列表的
// z-[60]），跟 HealthDetailDrawer 疊在 EditHealthDrawer 上面是同一個模式，
// 只是這裡存的是 session id 不是整筆資料——列表 API 沒有回傳逐句訊息，
// 開啟時要自己另外打 /mentor/sessions/{id} 撈完整對話回來還原畫面
export function MentorHistoryDetailDrawer() {
  const { t } = useTranslation();
  const sessionId = useAppStore((s) => s.mentorHistoryDetailSessionId);
  const setSessionId = useAppStore((s) => s.setMentorHistoryDetailSessionId);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const userInfo = useAuthStore((s) => s.userInfo);
  const open = sessionId !== null;
  const [detail, setDetail] = useState<MentorSessionDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (sessionId === null) {
      setDetail(null);
      setLoadFailed(false);
      return;
    }
    apiFetch<MentorSessionDetail>(`/mentor/sessions/${sessionId}`, {
      method: "GET",
    })
      .then(setDetail)
      .catch((error) => {
        console.error(error);
        setLoadFailed(true);
      });
  }, [sessionId]);

  function handleBack() {
    setSessionId(null);
  }

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex items-center gap-2 border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("mentor.historyBackAria")}
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold text-ink">
          {t("mentor.historyDetailTitle")}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          {loadFailed && (
            <p className="py-10 text-center text-sm text-ink/40">
              {t("mentor.historyDetailLoadFailed")}
            </p>
          )}

          {detail?.messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex items-end justify-end gap-2">
                <div className="max-w-[75%]">
                  {m.image_url ? (
                    <img
                      src={m.image_url}
                      alt={t("mentor.userUploadedImageAlt")}
                      className="max-h-56 w-full rounded-2xl rounded-br-sm object-cover"
                    />
                  ) : (
                    <div className="whitespace-pre-line rounded-2xl rounded-br-sm bg-[#dde6fb] px-4 py-3 text-sm leading-6 text-ink">
                      {m.content}
                    </div>
                  )}
                  <div className="mt-1 text-right text-[10px] text-ink/35">
                    {formatTime(m.created_at)}
                  </div>
                </div>
                <img
                  src={userInfo?.picture_url ?? userAvatarFallback}
                  alt={t("mentor.userAvatarAlt")}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              </div>
            ) : (
              <div key={i} className="flex items-end gap-2">
                <img
                  src={selectedPet?.avatar ?? petAvatarFallback}
                  alt={t("mentor.petAvatarAlt")}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <div className="max-w-[85%]">
                  <div className="whitespace-pre-line rounded-2xl rounded-bl-sm border border-[#ece4dc] bg-[#fffdfa] px-4 py-3 text-sm leading-6 text-ink">
                    {m.content}
                  </div>
                  <div className="mt-1 text-[10px] text-ink/35">
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            ),
          )}

          {detail?.is_finished &&
            detail.summary_sections &&
            detail.summary_sections.length > 0 && (
              <div className="rounded-2xl border border-[#ece0d2] bg-[#fdf7ee] p-4">
                <div className="text-xs font-semibold text-[#b9803f]">
                  {t("mentor.summaryTitle")}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {detail.summary_sections.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-5 text-ink/80"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#caa06f]" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
