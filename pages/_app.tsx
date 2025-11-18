import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { Toaster } from "../src/components/ui/toaster";
import { Toaster as Sonner } from "../src/components/ui/sonner";
import PageTracker from "../src/components/PageTracker";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import "../src/index.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  // Create QueryClient instance inside component to avoid sharing between users/requests
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Queue data: 12-hour cache
        staleTime: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
        gcTime: 24 * 60 * 60 * 1000, // 24 hours (formerly cacheTime)
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnMount: true, // Refetch when component mounts
        retry: 1, // Retry failed requests once
        refetchOnReconnect: true, // Refetch when network reconnects
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div>
            <Toaster />
            <Sonner />
            <PageTracker />
            <Component {...pageProps} />
          </div>
        </TooltipProvider>
      </ThemeProvider>
      {/* DevTools for debugging - only shows in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}