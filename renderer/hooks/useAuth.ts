import { useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import { saveSession } from '../lib/session';

export type AuthField = 'identifier' | 'email' | 'username' | 'password';
export interface AuthFailure { message: string; field?: AuthField }

const failureOf = (err: unknown, fallback: string): AuthFailure => {
  if (err instanceof ApiError) {
    const field = err.data?.field;
    return { message: err.message || fallback, field: field === 'email' || field === 'username' || field === 'password' ? field : undefined };
  }
  return { message: fallback };
};

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);

  /** Signs in with a username or e-mail. Resolves true on success; the failure is exposed in `failure`. */
  const login = async (identifier: string, password: string, remember: boolean) => {
    setIsLoading(true); setFailure(null);
    try {
      const data = await apiFetch('/api/Auth/login', { method: 'POST', body: JSON.stringify({ username: identifier.trim(), password }) });
      saveSession(data.token, data.username, remember);
      return true;
    } catch (err) {
      setFailure(failureOf(err, 'Não foi possível entrar.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /** Creates the account and signs straight in. */
  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true); setFailure(null);
    try {
      await apiFetch('/api/Auth/register', { method: 'POST', body: JSON.stringify({ email: email.trim(), username: username.trim(), password }) });
      const data = await apiFetch('/api/Auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) });
      saveSession(data.token, data.username, true);
      return true;
    } catch (err) {
      setFailure(failureOf(err, 'Não foi possível criar sua conta.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, register, isLoading, failure, clearFailure: () => setFailure(null) };
}
