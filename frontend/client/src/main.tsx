import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AuthProvider } from "./lib/authContext";
import "./lib/timeSync"; // Sincronización de tiempo con Nueva York

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="gemini-crm-theme">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
