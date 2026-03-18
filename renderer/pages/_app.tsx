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
      <div className="flex-1 overflow-hidden">
        <Component {...pageProps} />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "white",
            color: "black",
            border: "1px solid #e4e4e7",
          },
        }}
      />
    </div>
  );
}
