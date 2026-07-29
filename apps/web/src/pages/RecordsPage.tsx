import {
  Bot,
  Camera,
  ClipboardPlus,
  Smile,
  Syringe,
  Utensils,
} from "lucide-react";

export function RecordsPage() {
  const groups = [
    {
      day: "今天",
      items: [
        {
          icon: Syringe,
          label: "完成狂犬病疫苗接種",
          color: "bg-[#dcf2ec] text-[#3fa88f]",
        },
        {
          icon: Camera,
          label: "上傳了一張照片",
          color: "bg-[#ffe9d6] text-[#e0793f]",
        },
      ],
    },
    {
      day: "昨天",
      items: [
        {
          icon: Utensils,
          label: "新增飲食：雞胸肉 120g",
          color: "bg-[#fde3e0] text-[#e2685c]",
        },
        {
          icon: Smile,
          label: "心情紀錄：Happy",
          color: "bg-[#fff3c4] text-[#c99a2e]",
        },
      ],
    },
    {
      day: "2 天前",
      items: [
        {
          icon: ClipboardPlus,
          label: "健康檢查紀錄",
          color: "bg-[#eae3f7] text-[#8462c9]",
        },
      ],
    },
    {
      day: "上週",
      items: [
        {
          icon: Bot,
          label: "使用 AI 拍照診斷室",
          color: "bg-[#dbe7f4] text-[#5b83ab]",
        },
      ],
    },
  ];

  return (
    <section className="card p-4">
      <div className="relative space-y-4">
        <div className="absolute bottom-6 left-2 top-2 w-px bg-[#cdeee7]" />
        {groups.map((group) => (
          <div key={group.day} className="relative pl-10">
            <span className="absolute left-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-[#A6B9C7] text-[#ffffff]"></span>
            <div className="pt-1.5 text-xs font-semibold text-ink/70">
              {group.day}
            </div>
            <div className="mt-2 space-y-2">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${item.color}`}
                  >
                    <item.icon size={14} />
                  </span>
                  <span className="text-xs text-ink/80">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
