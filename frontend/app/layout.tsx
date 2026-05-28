'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1 },
    },
  }));

  useEffect(() => {
    const resetZoom = () => {
      const viewport = document.querySelector<HTMLMetaElement>('meta[name=viewport]');
      if (!viewport) return;
      // Snap viewport back to scale 1 by enforcing maximum-scale=1 momentarily
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
      // Immediately restore so the next pinch gesture is allowed
      requestAnimationFrame(() => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1');
      });
    };

    document.addEventListener('touchend', resetZoom);
    return () => document.removeEventListener('touchend', resetZoom);
  }, []);

  return (
    <html lang="en">
      <head>
        <title>AgentX · WFG Executive Summit</title>
        <meta name="description" content="Your companion app for the WFG Executive Summit 2026" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06090f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AgentX" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Google Fonts: DM Sans, DM Serif Display, Sora */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=Sora:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <div id="app">
            {children}
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
