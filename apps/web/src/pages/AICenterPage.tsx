import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ChevronDown, Image as ImageIcon, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";
import { useAuthStore } from "../store/useAuthStore";
import { calculateAge } from "../lib/utils";
import defaultPetAvatar from "../assets/images/default-avatar.png";
import type { Pet } from "../data/pets";

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
  const pets = usePetStore((s) => s.pets);
  const { showError } = useAlert();
  const userInfo = useAuthStore((s) => s.userInfo);

  // 這段對話「對象是哪隻寵物」是獨立於全域 selectedPet 的本地狀態，跟
  // AddVaccineFormDrawer.tsx 的 targetPet 同一套邏輯——使用者可以在這頁
  // 切換寵物聊，不會影響其他畫面正在看的寵物。預設值：如果是從 AiScanDrawer
  // 「詢問 AI 心靈導師」點過來的，優先選那次掃描的寵物；不然就跟全域
  // selectedPet 一樣
  const [targetPet, setTargetPet] = useState<Pet | null>(null);
  // 從 AiScanDrawer 點「詢問 AI 心靈導師」過來時，這段對話就是針對那次
  // 掃描的寵物問的，不該讓使用者中途換掉——切換器要鎖住、不能點。只有從
  // 底部導覽列直接點進「AI 導師」（沒有帶 aiScanReference）才能自由切換
  const [petSwitchLocked, setPetSwitchLocked] = useState(false);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
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

  // 只初始化一次：targetPet 一旦有值之後，就算 selectedPet/pets 之後又變，
  // 也不要跟著改（跟 AddVaccineFormDrawer 一樣，切好之後就是使用者自己
  // 的選擇，不該被全域狀態蓋掉）
  useEffect(() => {
    if (targetPet) return;
    if (aiScanReference) {
      const scannedPet = pets.find((p) => p.id === aiScanReference.petId);
      if (scannedPet) {
        setTargetPet(scannedPet);
        setPetSwitchLocked(true);
        return;
      }
    }
    if (selectedPet) setTargetPet(selectedPet);
  }, [targetPet, aiScanReference, selectedPet, pets]);

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

  async function startConversation(pet: Pet) {
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
          pet_id: pet.id,
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
  // 自動開一段新對話（對應 mockup 第一張圖：AI 主動開場，不是使用者先講話）。
  // 依賴 targetPet 而不是 selectedPet——切換寵物（handleSwitchPet）也是
  // 靠改 targetPet + 重置 startedRef 觸發這裡重新開一段新對話
  useEffect(() => {
    if (!targetPet || startedRef.current) return;
    startedRef.current = true;
    startConversation(targetPet);
    if (aiScanReference) {
      setAiScanReferenceForMentor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPet?.id]);

  async function sendMessage(content: string, imageUrl?: string) {
    if (!targetPet || isFinished) return;
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
          pet_id: targetPet.id,
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
    if (!targetPet) return;
    startedRef.current = false;
    setMessages([]);
    setSessionId(null);
    setIsFinished(false);
    setSummarySections(null);
    startedRef.current = true;
    startConversation(targetPet);
  }

  // 切換這段對話的對象寵物——後端 mentor_session 是綁定 pet_id 的
  // （見 app/routers/mentor.py 的 chat()），換寵物等於換一個全新的對象，
  // 沒辦法沿用舊的 sessionId 繼續聊，只能整段重置成新對話
  function handleSwitchPet(pet: Pet) {
    setPetPickerOpen(false);
    if (petSwitchLocked || pet.id === targetPet?.id || aiTyping) return;
    startedRef.current = false;
    setMessages([]);
    setSessionId(null);
    setIsFinished(false);
    setSummarySections(null);
    setTargetPet(pet);
  }

  const lastMessage = messages[messages.length - 1];
  const activeQuickReplies =
    !isFinished && lastMessage?.from === "ai"
      ? lastMessage.quickReplies
      : undefined;

  return (
    <div className="mx-auto max-w-md flex-col">
      {/* 真的 position: fixed 釘在畫面上——跟在一般文件流裡（不管是
          relative 還是 sticky）都會被上層頁面本身的捲動帶走不一樣，fixed
          是相對整個視窗定位，捲再多也不會動。top 要避開 AppLayout.tsx 的
          手機版 sticky header（約 56px 高，桌機版 lg:hidden 沒有這條，
          所以 lg 用比較小的 top），left 在桌機要讓開 Sidebar 的 250px，
          裡面再包一層 mx-auto max-w-md，水平位置才會跟下面捲動內容的
          欄寬對齊 */}
      <div className="fixed inset-x-0 top-14 z-20 px-3 sm:px-4 lg:left-[250px] lg:top-4 xl:px-5">
        {usage && (
          <div className="mb-2 w-fit rounded-full bg-[#eef4f6] px-3 py-1 text-[11px] font-medium text-[#688696]">
            {usage.unlimited
              ? t("mentor.usageUnlimited", { used: usage.used })
              : t("mentor.usageLimited", {
                  used: usage.used,
                  limit: usage.limit,
                })}
          </div>
        )}
        <div className="relative mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3 shadow-md">
          <img
            src={targetPet?.avatar ?? defaultPetAvatar}
            alt={targetPet?.name ?? ""}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            {petSwitchLocked ? (
              // 從 AiScanDrawer 過來的，這段對話鎖定在那次掃描的寵物身上，
              // 不能點、也不顯示可以展開選單的箭頭
              <span className="text-sm font-semibold text-ink">
                {targetPet?.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setPetPickerOpen((v) => !v)}
                aria-label={t("timeline.switchPetAria")}
                className="flex items-center gap-1 text-sm font-semibold text-ink"
              >
                {targetPet?.name}
                <ChevronDown size={14} className="text-ink/40" />
              </button>
            )}
            {targetPet && (
              <div className="truncate text-xs text-ink/45">
                {t("timeline.ageBreedWeight", {
                  age: calculateAge(targetPet.birthday),
                  breed: targetPet.breed,
                  weight: targetPet.weight,
                })}
              </div>
            )}
          </div>

          {petPickerOpen && !petSwitchLocked && (
            <div className="absolute left-3 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[#ece4dc] bg-white shadow-lg">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => handleSwitchPet(pet)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-[#fbf7f1] ${
                    targetPet?.id === pet.id ? "text-[#c9784a]" : "text-ink/70"
                  }`}
                >
                  <img
                    src={pet.avatar ?? defaultPetAvatar}
                    alt={pet.name}
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                  {pet.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 上面那張卡片變成 fixed 之後脫離了文件流，這裡要補一段等高的空白，
          不然底下的內容會被卡片蓋住 */}
      <div className="h-[96px] shrink-0" />

      <div className="h-[calc(100dvh-254px)] overflow-y-auto">
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
                  src={targetPet?.avatar ?? petAvatar}
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
                src={targetPet?.avatar ?? petAvatar}
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
