"use client";

import { Suspense, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query-client";
import { AuthInitializer } from "@/components/auth/auth-initializer";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <AuthInitializer />
      </Suspense>

      {children}

      <Toaster position="top-right" richColors closeButton duration={7000} />
    </QueryClientProvider>
  );
}
