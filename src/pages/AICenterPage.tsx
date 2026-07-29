import { Image as ImageIcon, Send } from "lucide-react";

const petAvatar =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&h=100&fit=crop";
const userAvatar =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop";

export function AICenterPage() {
  return (
    <div className="mx-auto flex max-h-[calc(100dvh-140px)] max-w-md flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
        <div className="flex items-end justify-end gap-2">
          <div className="max-w-[75%]">
            <div className="rounded-2xl rounded-br-sm bg-[#dde6fb] px-4 py-3 text-sm leading-6 text-ink">
              Coco，我家狗狗最近常常在晚上叫，看起來有點焦躁，該怎麼辦？
            </div>
            <div className="mt-1 text-right text-[10px] text-ink/35">09:42</div>
          </div>
          <img
            src={userAvatar}
            alt="使用者頭像"
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        </div>

        <div className="flex items-end gap-2">
          <img
            src={petAvatar}
            alt="Coco 頭像"
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
          <div className="max-w-[85%]">
            <div className="space-y-2 rounded-2xl rounded-bl-sm border border-[#ece4dc] bg-[#fffdfa] px-4 py-3 text-sm leading-6 text-ink">
              <p>謝謝你願意觀察並在意牠的情緒 🐾</p>
              <p>晚上叫可能是因為…</p>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>環境變化或不安全感</li>
                <li>精力沒被消耗完</li>
                <li>分離焦慮或想引起注意</li>
              </ol>
              <p>你可以先試試這些方法：</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>晚上散步或增加活動量</li>
                <li>提供安靜、舒適的睡覺環境</li>
                <li>睡前進行放鬆儀式（如輕柔按摩）</li>
              </ul>
              <p>你覺得哪一個方法最適合你們呢？我可以陪你一起試試看 🧡</p>
            </div>
            <div className="mt-1 text-[10px] text-ink/35">09:44</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pl-10">
          <button
            type="button"
            className="rounded-full bg-[#fbe9d9] px-4 py-2 text-xs font-medium text-[#b9803f] transition hover:brightness-95"
          >
            好有幫助！
          </button>
          <button
            type="button"
            className="rounded-full bg-[#dcefe9] px-4 py-2 text-xs font-medium text-[#3f9c8a] transition hover:brightness-95"
          >
            想知道更多
          </button>
          <button
            type="button"
            className="rounded-full bg-[#dde6fb] px-4 py-2 text-xs font-medium text-[#5b6fce] transition hover:brightness-95"
          >
            謝謝你
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pt-2">
        <button
          type="button"
          aria-label="上傳圖片"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3ece2] text-ink/50 transition hover:bg-[#ecdfd0]"
        >
          <ImageIcon size={18} />
        </button>
        <input
          className="min-w-0 flex-1 rounded-full border border-[#eee5dc] bg-white px-4 py-3 text-sm outline-none placeholder:text-ink/30"
          placeholder="輸入訊息..."
        />
        <button
          type="button"
          aria-label="送出訊息"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e8a56b] text-white transition hover:bg-[#dc9558]"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
