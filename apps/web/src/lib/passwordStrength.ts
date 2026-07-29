export const passwordRequirements = [
  { key: "length", label: "至少 8 個字元", test: (v: string) => v.length >= 8 },
  {
    key: "case",
    label: "包含英文大小寫字母",
    test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  {
    key: "digitOrSymbol",
    label: "包含數字或符號",
    test: (v: string) => /[\d!@#$%^&*(),.?":{}|<>]/.test(v),
  },
];

export function strengthOf(v: string) {
  const passed = passwordRequirements.filter((r) => r.test(v)).length;
  if (!v) return { ratio: 0, label: "弱", color: "#d9645a" };
  if (passed <= 1) return { ratio: 1 / 3, label: "弱", color: "#d9645a" };
  if (passed === 2) return { ratio: 2 / 3, label: "中", color: "#d9834f" };
  return { ratio: 1, label: "強", color: "#3fa876" };
}
