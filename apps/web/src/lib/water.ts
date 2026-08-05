import type { Pet } from "../data/pets";

// 每日建議飲水量：獸醫界常用的簡化估算法是體重(kg) x 50~60ml，這裡取
// 50ml/kg 當基準值。跟 calorie.ts 的每日熱量估算一樣，只能當參考值，
// 不是精確的個體需水量，也不能取代獸醫的專業建議。
const ML_PER_KG = 50;

// 算不出來（體重是 0 / 空）回傳 null，畫面上顯示 "--" 而不是硬算出一個
// 沒有意義的數字，跟 calculateDailyCalories 是同一套防呆邏輯
export function calculateDailyWaterTargetMl(pet: Pet): number | null {
  if (!pet.weight || pet.weight <= 0) return null;
  return Math.round(pet.weight * ML_PER_KG);
}
