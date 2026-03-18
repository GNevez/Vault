import React, { useState } from 'react'
import Head from 'next/head'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'

export default function HomePage() {
  const [view, setView] = useState<'login' | 'register'>('login')

  return (
    <>
      <Head>
        <title>{view === 'login' ? 'Login' : 'Register'} - Vault</title>
      </Head>

      <main className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-background-dark text-white">
        {view === 'login' ? (
          <LoginForm onSwitchToRegister={() => setView('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setView('login')} />
        )}
      </main>
    </>
  )
}
