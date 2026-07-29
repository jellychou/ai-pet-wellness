import { createTheme } from "@mui/material/styles";

// Maps MUI's theme to this app's existing Tailwind palette
// (see tailwind.config.js: ink / sand / cream / taupe) so MUI
// components and Tailwind-styled components look consistent.
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#c9a177", // sand
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#8a7b73", // taupe
    },
    background: {
      default: "#f7f5f2",
      paper: "#fffdfa",
    },
    text: {
      primary: "#574a45", // ink
      secondary: "rgba(87,74,69,0.6)",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans TC", system-ui, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
