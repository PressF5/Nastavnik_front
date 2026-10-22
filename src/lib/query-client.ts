import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Данные считаются актуальными в течение 60 секунд.
        staleTime: 60 * 1000,

        // Повторяем неудачный запрос один раз.
        retry: 1,

        // Обновляем данные при возвращении на вкладку.
        refetchOnWindowFocus: true,
      },
    },
  });
}
