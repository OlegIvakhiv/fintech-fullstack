'use client';

import { ScrollArea } from '@/components/ui/scroll-area';

export function GlobalScrollProvider({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="h-screen w-full">
      {children}
    </ScrollArea>
  );
}