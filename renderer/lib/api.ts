export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = response.status === 401 ? 'Your session expired. Please sign in again.' : `Request failed (${response.status})`;
    const body = await response.text();
    try {
      const errorData = JSON.parse(body);
      errorMsg = errorData.message || errorData.title || errorMsg;
    } catch { /* Keep the safe status message for non-JSON responses. */ }
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type');
  return contentType?.includes('application/json')
    ? response.json()
    : response.text();
}

export function authFetch(endpoint: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return apiFetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export function apiAssetUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
