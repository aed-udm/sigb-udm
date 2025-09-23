"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import React, { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";

import { RefreshProvider } from "@/contexts/refresh-context";
import { UdmThemeProvider } from "@/components/ui/udm-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Mémoisation du QueryClient avec configuration optimisée
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            retryDelay: 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UdmThemeProvider>
          <RefreshProvider>
            {children}
            <Toaster />
          </RefreshProvider>
        </UdmThemeProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
