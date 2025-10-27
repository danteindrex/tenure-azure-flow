import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { Toaster } from "../src/components/ui/toaster";
import { Toaster as Sonner } from "../src/components/ui/sonner";
import PageTracker from "../src/components/PageTracker";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import "../src/index.css";

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PageTracker />
          <Component {...pageProps} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}