import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Image as ImageIcon, Send } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

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
};

const aiReplies = [
  "謝謝你願意觀察並在意牠的情緒 🐾 我幫你整理了幾個可能的原因，你可以先試試調整看看，有需要隨時再跟我說喔！",
  "了解～這個狀況滿常見的，建議先觀察 2-3 天並記錄下來，如果持續沒有改善，會建議帶去給獸醫看看。",
  "收到這張照片了！看起來狀況還算穩定，但如果有紅腫或持續搔癢，還是建議儘快就醫比較保險喔。",
  "這是個很好的問題！我會建議從飲食和運動量兩個方向先調整，通常 1-2 週就會看到明顯改善。",
];

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

let nextId = 100;

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 1,
    from: "user",
    text: "Coco，我家狗狗最近常常在晚上叫，看起來有點焦躁，該怎麼辦？",
    time: "09:42",
  },
  {
    id: 2,
    from: "ai",
    text: "謝謝你願意觀察並在意牠的情緒 🐾\n晚上叫可能是因為…\n1. 環境變化或不安全感\n2. 精力沒被消耗完\n3. 分離焦慮或想引起注意\n\n你可以先試試這些方法：\n・晚上散步或增加活動量\n・提供安靜、舒適的睡覺環境\n・睡前進行放鬆儀式（如輕柔按摩）\n\n你覺得哪一個方法最適合你們呢？我可以陪你一起試試看 🧡",
    time: "09:44",
  },
];

export function AICenterPage() {
  // AiScanDrawer 按「詢問 AI 心靈導師」時會把這次分析結果存進來——這裡還是
  // 純前端假資料的聊天室（沒有真的後端對話），只是把這段 context 拿來組成
  // 開場白，讓使用者感覺得到「有把剛剛的分析結果帶過來」。只消費一次：
  // 讀到之後就從 store 清掉，重新整理/再逛回這頁不會一直重複帶入舊資料
  const aiScanReference = useAppStore((s) => s.aiScanReferenceForMentor);
  const setAiScanReferenceForMentor = useAppStore(
    (s) => s.setAiScanReferenceForMentor,
  );
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!aiScanReference) return DEFAULT_MESSAGES;
    const parts = [
      "已引用今日影像分析 🐾",
      aiScanReference.bodyPart ? `部位：${aiScanReference.bodyPart}` : null,
      aiScanReference.summary,
      aiScanReference.suggestions.length > 0
        ? `目前的建議：\n${aiScanReference.suggestions.map((s) => `・${s}`).join("\n")}`
        : null,
      "想多聊聊這件事，或是有其他觀察到的行為/情緒變化，都可以直接跟我說喔！",
    ].filter((p): p is string => Boolean(p));
    return [
      {
        id: 1,
        from: "ai",
        text: parts.join("\n\n"),
        time: now(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  // 只消費一次：畫面顯示完就把 store 裡的 reference 清掉
  useEffect(() => {
    if (aiScanReference) {
      setAiScanReferenceForMentor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replyFromAi() {
    setAiTyping(true);
    window.setTimeout(() => {
      setAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          from: "ai",
          text: aiReplies[Math.floor(Math.random() * aiReplies.length)],
          time: now(),
        },
      ]);
    }, 900);
  }

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId++, from: "user", text: trimmed, time: now() },
    ]);
    replyFromAi();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendText(input);
    setInput("");
  }

  function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMessages((prev) => [
      ...prev,
      { id: nextId++, from: "user", imageUrl: url, time: now() },
    ]);
    replyFromAi();
    e.target.value = "";
  }

  return (
    <div className="mx-auto max-w-md flex-col h-[calc(100dvh-178px)] overflow-y-auto">
      <div className="min-h-[calc(100dvh-191px)] flex-1 space-y-4 overflow-y-auto pb-2">
        {messages.map((m) =>
          m.from === "user" ? (
            <div key={m.id} className="flex items-end justify-end gap-2">
              <div className="max-w-[75%]">
                {m.imageUrl ? (
                  <img
                    src={m.imageUrl}
                    alt="使用者上傳的圖片"
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
                src={userAvatar}
                alt="使用者頭像"
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            </div>
          ) : (
            <div key={m.id} className="flex items-end gap-2">
              <img
                src={petAvatar}
                alt="Coco 頭像"
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
              src={petAvatar}
              alt="Coco 頭像"
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

        <div className="flex flex-wrap gap-2 pl-10">
          <button
            type="button"
            onClick={() => sendText("好有幫助！")}
            className="rounded-full bg-[#fbe9d9] px-4 py-2 text-xs font-medium text-[#b9803f] transition hover:brightness-95"
          >
            好有幫助！
          </button>
          <button
            type="button"
            onClick={() => sendText("想知道更多")}
            className="rounded-full bg-[#dcefe9] px-4 py-2 text-xs font-medium text-[#3f9c8a] transition hover:brightness-95"
          >
            想知道更多
          </button>
          <button
            type="button"
            onClick={() => sendText("謝謝你")}
            className="rounded-full bg-[#dde6fb] px-4 py-2 text-xs font-medium text-[#5b6fce] transition hover:brightness-95"
          >
            謝謝你
          </button>
        </div>
        <div ref={listEndRef} />
      </div>

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
          aria-label="上傳圖片"
          onClick={() => fileInputRef.current?.click()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3ece2] text-ink/50 transition hover:bg-[#ecdfd0]"
        >
          <ImageIcon size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-w-0 flex-1 rounded-full border border-[#eee5dc] bg-white px-4 py-3 text-sm outline-none placeholder:text-ink/30"
          placeholder="輸入訊息..."
        />
        <button
          type="submit"
          aria-label="送出訊息"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e8a56b] text-white transition hover:bg-[#dc9558] disabled:opacity-40"
          disabled={!input.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
