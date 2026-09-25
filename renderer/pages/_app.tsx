import React from 'react'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div
      className="relative h-screen w-screen flex flex-col overflow-hidden rounded-[12px] border border-border-thin bg-background-dark"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <Component {...pageProps} />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1b1b1f",
            color: "#f4f4f5",
            border: "1px solid #26262b",
          },
        }}
      />
    </div>
  );
}
