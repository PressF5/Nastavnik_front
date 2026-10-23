import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

interface BootstrapStatus {
  initialized: boolean;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Проверяем состояние платформы только для страниц настройки и входа.
  if (pathname !== "/bootstrap" && pathname !== "/login") {
    return NextResponse.next();
  }

  let status: BootstrapStatus;

  try {
    const response = await fetch(`${API_URL}/api/bootstrap/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Не удалось проверить состояние платформы" },
        { status: 503 },
      );
    }

    status = (await response.json()) as BootstrapStatus;
  } catch {
    return NextResponse.json(
      { message: "Сервер временно недоступен" },
      { status: 503 },
    );
  }

  if (pathname === "/bootstrap" && status.initialized) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && !status.initialized) {
    return NextResponse.redirect(new URL("/bootstrap", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bootstrap", "/login"],
};
