import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { zhTW } from "./locales/zh-TW";
import { en } from "./locales/en";

const resources = {
  "zh-TW": { translation: zhTW },
  en: { translation: en },
};

const STORAGE_KEY = "app-language";

// LanguageToggle.tsx 呼叫 i18n.changeLanguage() 只會改當下這次的記憶體
// 狀態，重新整理網頁就會掉回預設值——這裡補一個最小的持久化：初始化時
// 先讀 localStorage 裡存的語言，變更語言時存回去，不用額外裝
// i18next-browser-languagedetector 這個套件
function getInitialLanguage(): string {
  if (typeof window === "undefined") return "zh-TW";
  return window.localStorage.getItem(STORAGE_KEY) ?? "zh-TW";
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
  }
});

export default i18n;
