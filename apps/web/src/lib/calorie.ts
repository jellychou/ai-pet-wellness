import type { Pet } from "../data/pets";

// 每日熱量建議：先算「靜止能量需求」(RER, Resting Energy Requirement)，
// 再乘上依「絕育狀態 / 年齡 / 活動量」抓的係數，算出「每日總熱量需求」
// (MER, Maintenance Energy Requirement)。這是獸醫界常用的簡化估算法，
// 不是精確的個體代謝量測，只能當參考值，不能取代獸醫的專業建議。
//
// RER = 70 * 體重(kg)^0.75
// MER = RER * 係數

const PUPPY_OR_KITTEN_COEFFICIENT = 2.5; // 一歲以下，還在發育期
const SENIOR_COEFFICIENT = 1.4; // 七歲以上，高齡代謝下降
const NEUTERED_ADULT_COEFFICIENT = 1.6;
const INTACT_ADULT_COEFFICIENT = 1.8;

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  低: 0.9,
  中等: 1.0,
  高: 1.15,
};

function getAgeInYears(birthday: string): number | null {
  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return null;
  const ageMs = Date.now() - birthDate.getTime();
  return ageMs / (1000 * 60 * 60 * 24 * 365.25);
}

function getBaseCoefficient(pet: Pet, ageInYears: number | null): number {
  if (ageInYears !== null) {
    if (ageInYears < 1) return PUPPY_OR_KITTEN_COEFFICIENT;
    if (ageInYears >= 7) return SENIOR_COEFFICIENT;
  }
  // 沒有有效生日資料時，退回一般成年寵物的絕育/未絕育係數
  return pet.neutered === "1"
    ? NEUTERED_ADULT_COEFFICIENT
    : INTACT_ADULT_COEFFICIENT;
}

// 算不出來（體重是 0 / 空）回傳 null，畫面上顯示 "--" 而不是硬算出一個
// 沒有意義的數字
export function calculateDailyCalories(pet: Pet): number | null {
  if (!pet.weight || pet.weight <= 0) return null;

  const rer = 70 * Math.pow(pet.weight, 0.75);
  const ageInYears = getAgeInYears(pet.birthday);
  const baseCoefficient = getBaseCoefficient(pet, ageInYears);
  const activityMultiplier = ACTIVITY_MULTIPLIER[pet.activity] ?? 1;

  const mer = rer * baseCoefficient * activityMultiplier;
  return Math.round(mer);
}
