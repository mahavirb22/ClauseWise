const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorText || response.statusText}`);
  }

  return response.json() as Promise<T>;
}
