import React, { useEffect, useState } from 'react'

// Trimmed, resized copies of public/images/logo.png and logo_extenso.png.
const LOGO = '/images/brand/vault-logo.png'
const WORDMARK = '/images/brand/vault-wordmark.png'

const SLOGAN = { pt: 'Há mais do outro lado.', en: 'There’s more on the other side.' }

/** Mark with "vault" underneath, for the sign-in screens. */
export function BrandLogo({ className = '' }: { className?: string }) {
  return <img src={LOGO} alt="Vault" draggable={false} className={`select-none object-contain ${className}`} />
}

/** Horizontal "vault" wordmark, for the app bar. */
export function BrandWordmark({ className = '' }: { className?: string }) {
  return <img src={WORDMARK} alt="Vault" draggable={false} className={`select-none object-contain ${className}`} />
}

const isPortuguese = (language?: string | null) => !!language && language.toLowerCase().startsWith('pt')

/**
 * The slogan in Portuguese when the operating system is in Portuguese, otherwise in English.
 * Starts from the renderer locale (which Electron derives from the OS) and confirms with the
 * OS's own preferred languages from the main process.
 */
export function useSlogan() {
  const [portuguese, setPortuguese] = useState(() => typeof navigator !== 'undefined' && isPortuguese(navigator.language))
  useEffect(() => {
    window.ipc?.invoke('app-system-language')
      .then(language => { if (typeof language === 'string' && language) setPortuguese(isPortuguese(language)) })
      .catch(() => {})
  }, [])
  return portuguese ? SLOGAN.pt : SLOGAN.en
}

export function Slogan({ className = '' }: { className?: string }) {
  return <p className={className}>{useSlogan()}</p>
}
