/** HTTP failure with the status (0 = network) and the parsed JSON body, e.g. `{ message, field }`. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) { super(message); }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
  }

  if (!response.ok) {
    let errorMsg = response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : `A requisição falhou (${response.status}).`;
    let errorData: any;
    const body = await response.text();
    try {
      errorData = JSON.parse(body);
      // ASP.NET validation failures carry the useful text in `errors`, not in `title`.
      const validation = errorData.errors && Object.values(errorData.errors).flat()[0];
      errorMsg = errorData.message || (typeof validation === 'string' ? validation : '') || errorData.title || errorMsg;
    } catch { /* Keep the safe status message for non-JSON responses. */ }
    throw new ApiError(errorMsg, response.status, errorData);
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
