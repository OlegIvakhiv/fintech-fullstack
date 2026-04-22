'use client'; // This file is a client component, allowing us to use hooks and manage state.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/app/contexts/AuthContext";
import ExchangeFloatingWidget from "../components/ExchangeFloatingWidget";

export default function Providers({ children }: { children: React.ReactNode }) {
  // inizialize QueryClient once for the entire app
  const [queryClient] = useState(() => new QueryClient());

 return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ExchangeFloatingWidget/>
      </QueryClientProvider>
    </AuthProvider>
  );
}