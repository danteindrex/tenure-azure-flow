import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { Toaster } from "../src/components/ui/toaster";
import { Toaster as Sonner } from "../src/components/ui/sonner";
import PageTracker from "../src/components/PageTracker";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import SupabaseClientSingleton from "../src/lib/supabase";
import "../src/index.css";

const queryClient = new QueryClient();

export default function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  // Set the singleton instance to prevent multiple clients
  useEffect(() => {
    SupabaseClientSingleton.setInstance(supabaseClient);
  }, [supabaseClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SessionContextProvider supabaseClient={supabaseClient}>
            <PageTracker />
            <Component {...pageProps} />
          </SessionContextProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}