import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
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
        <BrowserRouter><App/></BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
)
