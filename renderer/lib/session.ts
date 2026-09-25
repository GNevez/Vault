import { authFetch } from './api';

// "Manter conectado" off: the token must not outlive this app run. sessionStorage lives exactly as long
// as the window, so a marker there tells a fresh launch apart from a reload or a logout → login cycle.
const EPHEMERAL = 'vault.ephemeralSession';
const ALIVE = 'vault.sessionAlive';

export function saveSession(token: string, username: string, remember: boolean) {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  if (remember) localStorage.removeItem(EPHEMERAL);
  else localStorage.setItem(EPHEMERAL, '1');
  sessionStorage.setItem(ALIVE, '1');
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem(EPHEMERAL);
  sessionStorage.removeItem(ALIVE);
}

/**
 * On startup: true when a remembered session is still valid on the server, so the login screen can be skipped.
 * Expired, revoked or non-remembered sessions are cleared.
 */
export async function restoreSession(): Promise<boolean> {
  if (!localStorage.getItem('token')) return false;
  if (localStorage.getItem(EPHEMERAL) && !sessionStorage.getItem(ALIVE)) { clearSession(); return false; }
  try {
    const account = await authFetch('/api/Account');
    localStorage.setItem('username', account.username);
    sessionStorage.setItem(ALIVE, '1');
    return true;
  } catch (e: any) {
    // Keep the token when the server is just unreachable; drop it when the server rejected it.
    if (e?.status === 401 || e?.status === 404) clearSession();
    return false;
  }
}
