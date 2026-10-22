const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// позволяет обрабатывать HTTP-ошибки по статусу, например 401, 403 и 400
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

// передаёт параметры в URL
type ApiRequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
};

// единая функция для GET, POST, PATCH и других HTTP-запросов
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Не задана переменная NEXT_PUBLIC_API_URL");
  }

  const { params, headers, ...requestOptions } = options;

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

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...headers,
    },
    // позволяет отправлять cookie, необходимые нам для будущего refresh-токена
    credentials: "include",
  });

  if (!response.ok) {
    const details: unknown = await response.json().catch(() => undefined);

    const errorMessage =
      typeof details === "object" &&
      details !== null &&
      "detail" in details &&
      typeof details.detail === "string"
        ? details.detail
        : `Ошибка HTTP: ${response.status}`;

    throw new ApiError(errorMessage, response.status, details);
  }

  // корректно обрабатывается без попытки прочитать JSON
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
