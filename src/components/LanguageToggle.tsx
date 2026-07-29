import { useTranslation } from 'react-i18next'
export function LanguageToggle(){const {i18n}=useTranslation(); const current=i18n.language; return <button onClick={()=>i18n.changeLanguage(current==='zh-TW'?'en':'zh-TW')} className="pill border border-sand bg-white/80 hover:bg-cream">{current==='zh-TW'?'EN':'繁中'}</button>}
