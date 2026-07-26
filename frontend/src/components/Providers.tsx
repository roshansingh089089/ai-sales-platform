"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Button,
  createTheme,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { useState } from "react";
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState<"light" | "dark">(prefersDark ? "dark" : "light");
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: "#315c8c" },
      background: { default: mode === "dark" ? "#0b1020" : "#f5f7fa" },
    },
    shape: { borderRadius: 10 },
    typography: { fontFamily: "Inter, Arial, sans-serif" },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Button
          size="small"
          variant="outlined"
          onClick={() => setMode((value) => (value === "dark" ? "light" : "dark"))}
          sx={{ position: "fixed", right: 24, top: 14, zIndex: 1500, bgcolor: "background.paper" }}
        >
          {mode === "dark" ? "Light" : "Dark"}
        </Button>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
