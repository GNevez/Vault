import { useState } from 'react';
import { apiFetch } from '../lib/api';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/Auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);
      return data;
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/Auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });
      return data;
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, register, isLoading, errorMsg };
}
