import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useRealtimeBridge } from "../hooks/use-realtime-bridge";
import { queryClient } from "../lib/query-client";

function RealtimeBridge() {
  useRealtimeBridge();
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      {children}
    </QueryClientProvider>
  );
}
