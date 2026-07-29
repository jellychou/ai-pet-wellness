export type HealthAttachment = {
  type: "pdf" | "image";
  name: string;
  url?: string;
};

export type HealthRecord = {
  date: string;
  title: string;
  weight: string;
  temp: string;
  heartRate: string;
  bloodTest: string;
  hospital: string;
  doctor: string;
  note: string;
  color: string;
  attachments: HealthAttachment[];
};

export const healthRecords: HealthRecord[] = [
  {
    date: "2025/05/10",
    title: "年度健康檢查",
    weight: "25.4 kg",
    temp: "38.5 °C",
    heartRate: "110 bpm",
    bloodTest: "一切正常",
    hospital: "Happy Animal Hospital",
    doctor: "Dr. Lee",
    note: "建議多運動、控制體重、定期追蹤心臟狀況",
    color: "bg-[#fbe0dd] text-[#d9645a]",
    attachments: [
      { type: "pdf", name: "檢驗表.pdf" },
      { type: "image", name: "心臟超音波.jpg" },
      { type: "image", name: "X光片.jpg" },
    ],
  },
  {
    date: "2024/11/08",
    title: "半年追蹤檢查",
    weight: "24.6 kg",
    temp: "38.6 °C",
    heartRate: "108 bpm",
    bloodTest: "一切正常",
    hospital: "Happy Animal Hospital",
    doctor: "Dr. Lee",
    note: "持續控制體重，維持運動量",
    color: "bg-[#dce8f5] text-[#5b83ab]",
    attachments: [{ type: "pdf", name: "檢驗表.pdf" }],
  },
  {
    date: "2024/05/12",
    title: "年度健康檢查",
    weight: "23.8 kg",
    temp: "38.4 °C",
    heartRate: "105 bpm",
    bloodTest: "一切正常",
    hospital: "Happy Animal Hospital",
    doctor: "Dr. Lee",
    note: "健康狀況良好，維持現有飲食",
    color: "bg-[#fbe0dd] text-[#d9645a]",
    attachments: [{ type: "pdf", name: "檢驗表.pdf" }],
  },
];
