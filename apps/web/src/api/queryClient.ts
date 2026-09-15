import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError, hasCode, isRetryable } from '@/api/http';
import { keys } from '@/api/queries';
import { session } from '@/api/session';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

/**
 * Устаревшие данные обновляются в одном месте для всех запросов и мутаций:
 * конфликт версии корзины — перечитать корзину (ключ расчёта сменится сам),
 * устаревший расчёт — создать новый. Пользователь видит сообщение и повторяет действие.
 */
function refreshStale(error: unknown) {
  if (hasCode(error, 'CART_VERSION_CONFLICT', 'CART_EMPTY'))
    void queryClient.invalidateQueries({ queryKey: keys.cart });
  else if (hasCode(error, 'QUOTE_EXPIRED', 'QUOTE_NOT_FOUND'))
    void queryClient.invalidateQueries({ queryKey: keys.quotes });
}

/** Повторы только для сетевых ошибок и 5xx — одно правило для всех запросов и мутаций. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: refreshStale }),
  mutationCache: new MutationCache({ onError: refreshStale }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Мутации безопасно повторять: количество абсолютное, создание защищено Idempotency-Key,
      // повтор сценария имитации разрешён API.
      retry: (failureCount, error) => failureCount < 1 && isRetryable(error),
      retryDelay: 1000,
    },
  },
});

// Сессию заменили (API не узнал прежний токен) — корзина и заказы в кэше чужие, перечитываем.
// Первое создание токена не в счёт: кэш ещё пуст, а запросы в полёте уже ждут этот токен.
let knownToken = session.get();
session.subscribe(() => {
  const token = session.get();
  if (knownToken && token !== knownToken) void queryClient.invalidateQueries();
  knownToken = token;
});

// This code is only for TypeScript
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

// This code is for all users
window.__TANSTACK_QUERY_CLIENT__ = queryClient;
