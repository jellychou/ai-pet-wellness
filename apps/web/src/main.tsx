import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { theme } from './theme'
import './index.css'
import './i18n/config'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* injectFirst puts MUI's generated styles at the top of <head>,
        so Tailwind utility classes (which load after) win any tie in
        the cascade instead of being silently overridden by MUI. */}
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* MUI X 的 DatePicker 等元件都要靠這層 Provider 才知道怎麼格式化/解析日期，
            少了它元件不會動、還會噴 context 相關的錯誤 */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <BrowserRouter basename={import.meta.env.BASE_URL}><App/></BrowserRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
)
