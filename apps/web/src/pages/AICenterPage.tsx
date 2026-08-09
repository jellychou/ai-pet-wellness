import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { History, Image as ImageIcon, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";
import { useAuthStore } from "../store/useAuthStore";

const petAvatar =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop";
const userAvatar =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop";

type Message = {
  id: number;
  from: "user" | "ai";
  text?: string;
  imageUrl?: string;
  time: string;
  // 只有 AI 訊息才有——每輪 AI 回應自己帶的快速回覆選項，不是前端寫死的，
  // 對話收斂（is_finished）之後最後一則 AI 訊息不會有這個
  quickReplies?: string[];
};

type MentorUsage = {
  used: number;
  limit: number;
  unlimited: boolean;
};

type MentorChatResponse = {
  id: number;
  is_finished: boolean;
  message: { role: string; content: string };
  created_at: string;
  summary_sections: string[] | null;
  quick_replies: string[] | null;
  usage: MentorUsage;
};

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

let nextId = 100;

export function AICenterPage() {
  const { t } = useTranslation();
  // AiScanDrawer 按「詢問 AI 心靈導師」時會把這次分析結果存進來——這裡拿來
  // 組成開場的背景資訊，讓後端 system prompt 可以直接引用，AI 的開場白就
  // 會提到「今天影像分析」的內容。只消費一次：讀到之後就從 store 清掉，
  // 重新整理/再逛回這頁不會一直重複帶入舊資料
  const aiScanReference = useAppStore((s) => s.aiScanReferenceForMentor);
  const setAiScanReferenceForMentor = useAppStore(
    (s) => s.setAiScanReferenceForMentor,
  );
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError } = useAlert();
  const userInfo = useAuthStore((s) => s.userInfo);
  const setMentorHistoryOpen = useAppStore((s) => s.setMentorHistoryOpen);

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [summarySections, setSummarySections] = useState<string[] | null>(null);
  const [usage, setUsage] = useState<MentorUsage | null>(null);
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  function applyResponse(res: MentorChatResponse) {
    setSessionId(res.id);
    setIsFinished(res.is_finished);
    setSummarySections(res.summary_sections);
    setUsage(res.usage);
    setMessages((prev) => [
      ...prev,
      {
        id: nextId++,
        from: "ai",
        text: res.message.content,
        time: now(),
        quickReplies: res.quick_replies ?? undefined,
      },
    ]);
  }

  async function startConversation() {
    if (!selectedPet) return;
    setAiTyping(true);
    try {
      const context = aiScanReference
        ? [
            "已引用今日影像分析",
            aiScanReference.bodyPart
              ? `部位：${aiScanReference.bodyPart}`
              : null,
            aiScanReference.summary,
            aiScanReference.suggestions.length > 0
              ? `目前的建議：${aiScanReference.suggestions.join("；")}`
              : null,
          ]
            .filter((p): p is string => Boolean(p))
            .join("\n")
        : undefined;
      const res = await apiFetch<MentorChatResponse>("/mentor/chat", {
        method: "POST",
        body: JSON.stringify({
          pet_id: selectedPet.id,
          mentor_session_id: null,
          content: "",
          context,
        }),
      });
      applyResponse(res);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : t("mentor.openFailed"),
      );
    } finally {
      setAiTyping(false);
    }
  }

  // 只消費一次：畫面顯示完就把 store 裡的 reference 清掉，並在同一個時機
  // 自動開一段新對話（對應 mockup 第一張圖：AI 主動開場，不是使用者先講話）
  useEffect(() => {
    if (!selectedPet || startedRef.current) return;
    startedRef.current = true;
    startConversation();
    if (aiScanReference) {
      setAiScanReferenceForMentor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPet?.id]);

  async function sendMessage(content: string, imageUrl?: string) {
    if (!selectedPet || isFinished) return;
    if (!content.trim() && !imageUrl) return;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId++,
        from: "user",
        text: content.trim() || undefined,
        imageUrl,
        time: now(),
      },
    ]);
    setAiTyping(true);
    try {
      const res = await apiFetch<MentorChatResponse>("/mentor/chat", {
        method: "POST",
        body: JSON.stringify({
          pet_id: selectedPet.id,
          mentor_session_id: sessionId,
          content,
          image_url: imageUrl ?? null,
        }),
      });
      applyResponse(res);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : t("mentor.replyFailed"),
      );
    } finally {
      setAiTyping(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text);
  }

  async function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await uploadImageToCloudinary(file);
      await sendMessage("", url);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : t("mentor.imageUploadFailed"),
      );
    }
  }

  function handleRestart() {
    startedRef.current = false;
    setMessages([]);
    setSessionId(null);
    setIsFinished(false);
    setSummarySections(null);
    startedRef.current = true;
    startConversation();
  }

  const lastMessage = messages[messages.length - 1];
  const activeQuickReplies =
    !isFinished && lastMessage?.from === "ai"
      ? lastMessage.quickReplies
      : undefined;

  return (
    <div className="mx-auto max-w-md flex-col h-[calc(100dvh-178px)] overflow-y-auto">
      <div className="mb-2 flex items-center justify-between gap-2">
        {usage ? (
          <div className="w-fit rounded-full bg-[#eef4f6] px-3 py-1 text-[11px] font-medium text-[#688696]">
            {usage.unlimited
              ? t("mentor.usageUnlimited", { used: usage.used })
              : t("mentor.usageLimited", {
                  used: usage.used,
                  limit: usage.limit,
                })}
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setMentorHistoryOpen(true)}
          aria-label={t("mentor.historyAria")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/50 transition hover:bg-cream"
        >
          <History size={16} />
        </button>
      </div>
      <div className="min-h-[calc(100dvh-191px)] flex-1 space-y-4 overflow-y-auto pb-2">
        {messages.map((m) =>
          m.from === "user" ? (
            <div key={m.id} className="flex items-end justify-end gap-2">
              <div className="max-w-[75%]">
                {m.imageUrl ? (
                  <img
                    src={m.imageUrl}
                    alt={t("mentor.userUploadedImageAlt")}
                    className="max-h-56 w-full rounded-2xl rounded-br-sm object-cover"
                  />
                ) : (
                  <div className="whitespace-pre-line rounded-2xl rounded-br-sm bg-[#dde6fb] px-4 py-3 text-sm leading-6 text-ink">
                    {m.text}
                  </div>
                )}
                <div className="mt-1 text-right text-[10px] text-ink/35">
                  {m.time}
                </div>
              </div>
              <img
                src={userInfo?.picture_url ?? userAvatar}
                alt={t("mentor.userAvatarAlt")}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            </div>
          ) : (
            <div key={m.id} className="flex items-end gap-2">
              <img
                src={petAvatar}
                alt={t("mentor.petAvatarAlt")}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              <div className="max-w-[85%]">
                <div className="whitespace-pre-line rounded-2xl rounded-bl-sm border border-[#ece4dc] bg-[#fffdfa] px-4 py-3 text-sm leading-6 text-ink">
                  {m.text}
                </div>
                <div className="mt-1 text-[10px] text-ink/35">{m.time}</div>
              </div>
            </div>
          ),
        )}

        {aiTyping && (
          <div className="flex items-end gap-2">
            <img
              src={selectedPet?.avatar ?? userAvatar}
              alt={t("mentor.petAvatarAlt")}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 分析結果卡片——is_finished=true 時後端回的重點整理，對應
            mockup 第三張圖的分類條列，取代原本的聊天泡泡形式 */}
        {isFinished && summarySections && summarySections.length > 0 && (
          <div className="rounded-2xl border border-[#ece0d2] bg-[#fdf7ee] p-4">
            <div className="text-xs font-semibold text-[#b9803f]">
              {t("mentor.summaryTitle")}
            </div>
            <ul className="mt-2 space-y-1.5">
              {summarySections.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-5 text-ink/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#caa06f]" />
                  {s}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleRestart}
              className="mt-3 w-full rounded-full bg-[#e8a56b] py-2.5 text-xs font-semibold text-white transition hover:bg-[#dc9558]"
            >
              {t("mentor.restart")}
            </button>
          </div>
        )}

        {activeQuickReplies && activeQuickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            {activeQuickReplies.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => sendMessage(option)}
                className="rounded-full bg-[#fbe9d9] px-4 py-2 text-xs font-medium text-[#b9803f] transition hover:brightness-95"
              >
                {option}
              </button>
            ))}
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      {!isFinished && (
        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-center gap-2 pt-2 fixed left-[6px] right-[6px] bottom-[70px]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />
          <button
            type="button"
            aria-label={t("mentor.uploadImageAria")}
            onClick={() => fileInputRef.current?.click()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3ece2] text-ink/50 transition hover:bg-[#ecdfd0]"
          >
            <ImageIcon size={18} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-w-0 flex-1 rounded-full border border-[#eee5dc] bg-white px-4 py-3 text-sm outline-none placeholder:text-ink/30"
            placeholder={t("mentor.messagePlaceholder")}
          />
          <button
            type="submit"
            aria-label={t("mentor.sendAria")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e8a56b] text-white transition hover:bg-[#dc9558] disabled:opacity-40"
            disabled={!input.trim()}
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
