// 健康檢查報告的 report_type 代碼 -> 中文標籤對照表。
// 跟後端 app/schemas/report.py 的 ReportType（Literal["1"..."6"]）要保持一致，
// 兩邊誰改了值都要記得同步另一邊。
export enum ReportTypeEnum {
  "1" = "年度健康檢查",
  "2" = "血液檢查",
  "3" = "糞便檢查",
  "4" = "心臟檢查",
  "5" = "超音波檢查",
  "6" = "其他檢查",
}

// 把後端存的 report_type 代碼（"1".."6"）轉成中文標籤；遇到不在對照表裡的
// 代碼（例如資料髒掉、以後加了新類型但前端還沒更新）就照原樣印出來，不會
// 讓畫面整個爆掉或顯示 undefined
export function formatReportType(value: string): string {
  return (ReportTypeEnum as Record<string, string>)[value] ?? value;
}
