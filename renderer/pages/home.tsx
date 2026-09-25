import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from '../components/auth/AuthUi'
import { BrandLogo } from '../components/ui/Brand'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { restoreSession } from '../lib/session'

type View = 'login' | 'register'

export default function HomePage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  // A remembered session skips this screen; until that is known, show a quiet splash instead of flashing the form.
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    restoreSession().then(signedIn => {
      if (!active) return
      if (signedIn) void router.replace('/dashboard')
      else { window.ipc?.send('window-enter-login', null); setChecking(false) }
    })
    return () => { active = false }
  }, [router])

  const enter = () => { void router.push('/dashboard') }
  const switchTo = (next: View) => () => setView(next)

  return (
    <>
      <Head>
        <title>{`VAULT · ${view === 'login' ? 'Entrar' : 'Criar conta'}`}</title>
      </Head>

      {checking ? (
        <div className="grid h-full place-items-center bg-background-dark">
          <div className="text-center">
            <BrandLogo className="mx-auto h-24 w-auto" />
            <Loader2 size={18} className="mx-auto mt-5 animate-spin text-zinc-600" aria-label="Carregando" />
          </div>
        </div>
      ) : (
        <AuthLayout
          compact={view === 'register'}
          footer={view === 'login'
            ? <>Novo no VAULT? <button type="button" onClick={switchTo('register')} className="font-semibold text-accent transition hover:text-accent-strong">Criar uma conta</button></>
            : <>Já tem uma conta? <button type="button" onClick={switchTo('login')} className="font-semibold text-accent transition hover:text-accent-strong">Entrar</button></>}
        >
          {view === 'login' ? <LoginForm key="login" onSuccess={enter} /> : <RegisterForm key="register" onSuccess={enter} />}
        </AuthLayout>
      )}
    </>
  )
}
