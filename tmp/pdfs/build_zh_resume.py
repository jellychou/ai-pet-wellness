from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import os

OUT = "output/pdf/Jelly_Chou_Resume_Traditional_Chinese.pdf"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
pdfmetrics.registerFont(TTFont("CJK", FONT))

W, H = A4
C_NAVY = HexColor("#18385f")
C_BLUE = HexColor("#1768b5")
C_TEXT = HexColor("#202735")
C_MUTED = HexColor("#6f829e")
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Jelly Chou 中文履歷")

LEFT, RIGHT = 45, W - 45

def txt(x, y, s, size=8.4, color=C_TEXT, font="CJK"):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, s)

def centered(y, s, size, color=C_TEXT):
    c.setFont("CJK", size)
    c.setFillColor(color)
    c.drawCentredString(W/2, y, s)

def right(y, s, size=7.9, color=C_MUTED):
    c.setFont("CJK", size)
    c.setFillColor(color)
    c.drawRightString(RIGHT, y, s)

def section(y, title):
    txt(LEFT, y, title, 10.8, C_NAVY)
    c.setStrokeColor(C_BLUE)
    c.setLineWidth(0.8)
    c.line(LEFT, y-7, RIGHT, y-7)
    return y-18

def wrap(s, max_width, size):
    lines, cur = [], ""
    for ch in s:
        test = cur + ch
        if pdfmetrics.stringWidth(test, "CJK", size) <= max_width:
            cur = test
        else:
            lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines

def paragraph(y, s, size=8.1, leading=12.0, x=LEFT, width=RIGHT-LEFT):
    for line in wrap(s, width, size):
        txt(x, y, line, size)
        y -= leading
    return y

def job(y, company, dates, bullets):
    txt(LEFT+11, y, company, 9.0)
    right(y, dates, 7.7)
    y -= 13
    txt(LEFT, y, "前端工程師" if "未來" not in company else "資深前端工程師", 8.5, C_BLUE)
    y -= 12
    for b in bullets:
        lines = wrap("• " + b, RIGHT-(LEFT+8), 7.65)
        for i, line in enumerate(lines):
            txt(LEFT+8, y, line, 7.65)
            y -= 10.3
        y -= 0.8
    return y + 1

centered(H-57, "JELLY CHOU", 20, C_NAVY)
centered(H-77, "台北，台灣 • iawj0224@gmail.com • LinkedIn • GitHub", 8.2, C_MUTED)

y = section(H-101, "專業摘要")
summary = ("具 6 年以上經驗的資深前端工程師，專精於打造高效能、可擴充的 Web 應用與即時系統。"
           "熟悉 React、Next.js、Vue.js 與 TypeScript，著重效能優化、GraphQL 及 WebSocket 技術；"
           "並積極整合大型語言模型（LLM）、RAG、LangChain 與提示工程等現代 AI 能力，打造智慧化使用者體驗。"
           "擅長運用清晰架構與工程最佳實務，縮短開發時程、降低資料傳輸量並提升載入速度。")
y = paragraph(y, summary, 7.85, 11.5)
y -= 7

y = section(y, "工作經歷")
y = job(y, "未來無線智能有限公司", "台北，台灣 | 2022 年 11 月 - 2026 年 4 月", [
    "使用 React 18、Next.js 與 TypeScript 設計並交付可擴充的 Web 應用與後台管理平台；透過可重用元件架構，將功能開發時間縮短 35%。",
    "優化 GraphQL 查詢與快取策略，使 API 傳輸資料量降低 45%，並減少 50% 的重複網路請求。",
    "運用程式碼分割、延遲載入與渲染優化提升應用效能，使首頁載入速度提高 40%。",
    "導入 Vite、ESLint 與 Prettier 改善開發流程，建置時間縮短 30%，同時提升程式碼品質與團隊一致性。",
])
y = job(y, "艾克森科技有限公司", "台北，台灣 | 2022 年 5 月 - 2022 年 9 月", [
    "使用 Vue 3、Nuxt.js 與 Tailwind CSS 規劃響應式企業入口網站；藉由可重用元件設計，將 UI 開發時間縮短 30%。",
    "調整 Webpack 與 Vite 建置設定以優化前端效能，使套件體積降低 35%，並提升頁面載入速度。",
    "於敏捷開發環境中與設計師及後端工程師協作，準時交付高品質企業應用。",
])
y = job(y, "智雲科技股份有限公司", "台北，台灣 | 2020 年 9 月 - 2022 年 5 月", [
    "使用 Vue 2/3 開發高效能遊戲用戶端與後台管理儀表板，支援高併發即時應用。",
    "運用 WebSocket 與 Protocol Buffers（ProtoBuf）優化即時通訊，使訊息傳輸量降低 60%，資料傳輸效率提升 35%。",
    "導入可重用元件架構，並參與敏捷／Scrum 流程（Jira、Git），減少 40% 重複程式碼並加速功能交付。",
])
y = job(y, "酷寶資訊有限公司", "台北，台灣 | 2020 年 4 月 - 2020 年 9 月", [
    "使用 Socket.IO 與 WebSocket 建立即時線上客服聊天功能，維持低延遲且持續穩定的伺服器與用戶端通訊。",
])
y -= 1

y = section(y, "專業技能")
skills = [
    ("程式語言與 AI", "TypeScript、JavaScript（ES6+）、Python、HTML5、CSS3/SCSS、OpenAI API、LLM 整合、提示工程、RAG、MCP"),
    ("前端與狀態管理", "React 18、Next.js、Vue.js（2/3）、Nuxt.js、Redux Toolkit、Pinia、Tailwind CSS、Bootstrap 4"),
    ("即時通訊與 API", "WebSocket、Socket.IO、Protocol Buffers（ProtoBuf）、GraphQL、RESTful API"),
    ("後端與 AI 開發", "Python、FastAPI、PostgreSQL、SQLAlchemy、LangChain、向量資料庫、AI Agents"),
    ("DevOps 與工具", "Docker、Git、GitHub Actions、CI/CD、Vite、Webpack、Jira、效能優化、SEO"),
]
for label, value in skills:
    txt(LEFT+11, y, label, 7.65, C_NAVY)
    lines = wrap(value, RIGHT-(LEFT+105), 7.55)
    for i, line in enumerate(lines):
        txt(LEFT+105, y, line, 7.55)
        y -= 9.7
    y -= 1.5

y -= 1
y = section(y, "學歷")
txt(LEFT+11, y, "亞洲大學｜食品營養與保健生技學系 理學學士", 8.4)
right(y, "2011 年 9 月 - 2015 年 5 月", 7.7)
y -= 12
txt(LEFT, y, "台中，台灣", 7.7, C_MUTED)

c.save()
print(OUT)
