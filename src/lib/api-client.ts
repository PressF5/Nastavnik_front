const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiRequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
};

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}

async function prepareCsrfToken(): Promise<string> {
  if (!API_BASE_URL) {
    throw new Error("Не задана переменная NEXT_PUBLIC_API_URL");
  }

  // Запрашиваем endpoint напрямую, чтобы не вызывать apiFetch рекурсивно.
  const response = await fetch(
    `${API_BASE_URL.replace(/\/+$/, "")}/api/auth/csrf`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new ApiError("Не удалось получить CSRF-токен.", response.status);
  }

  // В режиме Spring Security SPA используем значение cookie XSRF-TOKEN.
  const token = getCookie("XSRF-TOKEN");

  if (!token) {
    throw new Error(
      "CSRF cookie XSRF-TOKEN не получена. Проверьте настройки Spring Security и CORS.",
    );
  }

  return token;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Не задана переменная NEXT_PUBLIC_API_URL");
  }

  const { params, headers: initialHeaders, ...requestOptions } = options;

  const url = new URL(
    `${API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const method = (requestOptions.method ?? "GET").toUpperCase();
  const isUnsafeMethod = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

  const headers = new Headers(initialHeaders);
  headers.set("Accept", "application/json");

  if (
    requestOptions.body !== undefined &&
    !(
      typeof FormData !== "undefined" && requestOptions.body instanceof FormData
    )
  ) {
    headers.set("Content-Type", "application/json");
  }

  // CSRF нужен для POST, PUT, PATCH, DELETE и других небезопасных методов.
  if (isUnsafeMethod && typeof document !== "undefined") {
    const csrfToken = await prepareCsrfToken();
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(url, {
    ...requestOptions,
    method,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const details: unknown = await response.json().catch(() => undefined);

    let message = `Ошибка HTTP: ${response.status}`;

    if (typeof details === "object" && details !== null) {
      if ("message" in details && typeof details.message === "string") {
        message = details.message;
      } else if ("error" in details && typeof details.error === "string") {
        message = details.error;
      }
    }

    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
