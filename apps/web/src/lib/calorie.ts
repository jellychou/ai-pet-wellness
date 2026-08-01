import type { Pet } from "../data/pets";

// 每日熱量建議：先算「靜止能量需求」(RER, Resting Energy Requirement)，
// 再乘上依「絕育狀態 / 年齡 / 活動量」抓的係數，算出「每日總熱量需求」
// (MER, Maintenance Energy Requirement)。這是獸醫界常用的簡化估算法，
// 不是精確的個體代謝量測，只能當參考值，不能取代獸醫的專業建議。
//
// RER = 70 * 體重(kg)^0.75
// MER = RER * 係數

const PUPPY_OR_KITTEN_COEFFICIENT = 2.5; // 半歲以下，還在快速發育期
// 半歲到一歲之間，係數從 2.5 線性往成犬/成貓的係數靠攏（見 getBaseCoefficient）。
// 沒有這段緩衝的話，滿 1 歲的前一天還是 2.5、滿 1 歲當天直接摔到 1.6/1.8，
// 差距接近 1.5 倍，不管是真的快滿一歲的幼犬幼貓、還是生日資料剛好卡在
// 邊界，都會算出一個誇張跳動的數字（之前 12kg、算成 1128 大卡的回報，
// 換算回去剛好對到套了整段 2.5 沒有 taper 的結果）
const GROWTH_TAPER_START_AGE = 0.5;
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

function getAdultCoefficient(pet: Pet): number {
  return pet.neutered === "1"
    ? NEUTERED_ADULT_COEFFICIENT
    : INTACT_ADULT_COEFFICIENT;
}

function getBaseCoefficient(pet: Pet, ageInYears: number | null): number {
  // 沒有有效生日資料時，退回一般成年寵物的絕育/未絕育係數
  if (ageInYears === null) return getAdultCoefficient(pet);

  if (ageInYears >= 7) return SENIOR_COEFFICIENT;
  if (ageInYears < GROWTH_TAPER_START_AGE) return PUPPY_OR_KITTEN_COEFFICIENT;

  if (ageInYears < 1) {
    // 半歲到一歲之間線性內插，見上面 GROWTH_TAPER_START_AGE 的說明
    const adultCoefficient = getAdultCoefficient(pet);
    const progress =
      (ageInYears - GROWTH_TAPER_START_AGE) / (1 - GROWTH_TAPER_START_AGE);
    return (
      PUPPY_OR_KITTEN_COEFFICIENT -
      (PUPPY_OR_KITTEN_COEFFICIENT - adultCoefficient) * progress
    );
  }

  return getAdultCoefficient(pet);
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

// 蛋白質/脂肪/碳水的公克數：先照上面算出來的每日熱量，
// 再依「物種」抓一組熱量佔比去分配，最後用熱量密度換算成公克。
// 狗跟貓的比例不一樣——貓是肉食動物，蛋白質需求比狗高很多、碳水要壓低。
// 這組比例是簡化過的參考值（不是精確的個體營養需求），只能當方向，
// 不能取代獸醫或寵物營養師的專業建議。
const MACRO_CALORIE_RATIO: Record<
  "dog" | "cat",
  { protein: number; fat: number; carb: number }
> = {
  dog: { protein: 0.3, fat: 0.2, carb: 0.5 },
  cat: { protein: 0.4, fat: 0.3, carb: 0.3 },
};

// Atwater 係數：1 公克蛋白質/碳水 = 4 kcal，1 公克脂肪 = 9 kcal
const KCAL_PER_GRAM = { protein: 4, fat: 9, carb: 4 };

export type MacroGrams = { protein: number; fat: number; carb: number };

export function calculateMacros(pet: Pet): MacroGrams | null {
  const dailyCalories = calculateDailyCalories(pet);
  if (dailyCalories === null) return null;

  const ratio = MACRO_CALORIE_RATIO[pet.species] ?? MACRO_CALORIE_RATIO.dog;

  return {
    protein: Math.round((dailyCalories * ratio.protein) / KCAL_PER_GRAM.protein),
    fat: Math.round((dailyCalories * ratio.fat) / KCAL_PER_GRAM.fat),
    carb: Math.round((dailyCalories * ratio.carb) / KCAL_PER_GRAM.carb),
  };
}
