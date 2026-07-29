# Food・Heart (monorepo)

依照指定設計稿重新切版的寵物飲食與 AI 心靈導師前端專案。使用 npm workspaces 管理，之後會陸續加入後端 API / 其他 app。

## 專案結構
```
.
├── apps/
│   └── web/        # React 前端（原本的專案內容都在這裡）
└── packages/        # 未來共用套件放這裡（目前是空的）
```

## 技術
- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- i18next（繁體中文 / English）

## 本次重切重點
- 固定左側品牌與導覽 Sidebar
- Dashboard 密集卡片 Grid，而非一般單欄後台
- 寵物資訊、疫苗、飲食、AI 診斷、AI 對話、心情、歷史日誌、健康檢查、熱量建議
- 底部統計分析、UI Components、核心功能區
- Desktop / Tablet / Mobile RWD

## 執行
在 repo 根目錄安裝（npm workspaces 會自動處理所有 apps/packages）：
```bash
npm install
npm run dev
```
也可以指定單一 workspace 執行：
```bash
npm run dev -w apps/web
```

## 建置
```bash
npm run build
```

> 寵物照片目前使用線上示意圖，正式開發可替換成 API 或本機 assets。

## 部署到 GitHub Pages
push 到 `main` 會自動觸發 `.github/workflows/deploy.yml`，build `apps/web` 並部署到 GitHub Pages。第一次啟用需要到 repo 的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**（只需設定一次）。部署完成後網址會是：

```
https://jellychou.github.io/ai-pet-wellness/
```
