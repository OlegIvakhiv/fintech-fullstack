import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { GlobalScrollProvider } from "@/components/global-scroll-provider";
import { ScrollArea } from "@/components/ui/scroll-area";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fintech Platform",
  description: "Investment dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}>
        <GlobalScrollProvider>
          <Providers>
            {/* Full‑height flex container */}
            <div className="h-screen flex flex-col">
              {/* Main scrollable area – all page content goes here */}
              <ScrollArea className="flex-1">
                <div className="min-h-full">
                  {children}
                </div>
              </ScrollArea>
            </div>
            <div id="modal-root" />
          </Providers>
        </GlobalScrollProvider>
      </body>
    </html>
  );
}