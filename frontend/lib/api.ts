const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? (body as { detail: unknown }).detail
        : null;
    const detailMessage =
      typeof detail === 'object' &&
      detail !== null &&
      'message' in detail &&
      typeof detail.message === 'string'
        ? detail.message
        : null;
    const message =
      typeof detail === 'string'
        ? detail
        : detailMessage ??
          (response.status === 401
            ? 'Faça login para continuar.'
            : 'Não foi possível concluir a solicitação. Tente novamente.');
    throw new ApiError(message, response.status);
  }

  return body as T;
}
