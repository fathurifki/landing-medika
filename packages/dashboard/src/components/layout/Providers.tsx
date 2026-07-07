"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { invalidateTokenCache } from "@/lib/api";
import { dashboardAuthBasePath } from "@/lib/routes";

// Watches for session changes and clears the token cache so the next
// API call fetches a fresh token instead of using a stale one.
function SessionWatcher() {
  const { data: session } = useSession();
  const prevToken = useRef<string | null>(null);

  useEffect(() => {
    const current = (session as any)?.accessToken ?? null;
    if (prevToken.current !== null && prevToken.current !== current) {
      invalidateTokenCache();
    }
    prevToken.current = current;
  }, [session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  }));

  return (
    <SessionProvider
      basePath={dashboardAuthBasePath}
      // JWT strategy — token lives in the cookie and is validated in middleware.
      // No need to poll the session endpoint on every mount or window focus.
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <SessionWatcher />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
