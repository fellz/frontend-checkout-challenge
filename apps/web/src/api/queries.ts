import { queryOptions, skipToken } from '@tanstack/react-query';
import { api } from './endpoints';
import type { Payment, QuoteBody } from './types';

const MINUTE = 60_000;
/** Интервал опроса статуса оплаты: API рекомендует 500–1000 мс. */
export const POLL_INTERVAL = 1000;

const FINAL_PAYMENT: ReadonlySet<Payment['status']> = new Set(['succeeded', 'failed', 'cancelled']);
export const isFinalPayment = (payment: Payment | undefined) =>
  payment !== undefined && FINAL_PAYMENT.has(payment.status);

/**
 * Ключи кэша. Корзина и условия оформления (они содержат корзину) лежат под префиксом `cart`
 * и сбрасываются разом; расчёты — под `quote`, их ключ включает версию корзины и доставку.
 */
export const keys = {
  products: ['products'] as const,
  sandbox: ['sandbox'] as const,
  cart: ['cart'] as const,
  checkoutOptions: ['cart', 'options'] as const,
  quotes: ['quote'] as const,
  quote: (body: QuoteBody | null) => ['quote', body] as const,
  order: (orderId: string) => ['orders', orderId] as const,
  payments: (orderId: string) => ['orders', orderId, 'payments'] as const,
};

export const productsQuery = queryOptions({
  queryKey: keys.products,
  queryFn: ({ signal }) => api.products(signal),
  staleTime: 5 * MINUTE,
});

export const sandboxQuery = queryOptions({
  queryKey: keys.sandbox,
  queryFn: ({ signal }) => api.sandbox(signal),
  staleTime: 5 * MINUTE,
});

export const cartQuery = queryOptions({
  queryKey: keys.cart,
  queryFn: ({ signal }) => api.cart.get(signal),
});

export const checkoutOptionsQuery = queryOptions({
  queryKey: keys.checkoutOptions,
  queryFn: ({ signal }) => api.checkoutOptions(signal),
});

/**
 * Расчёт — производное от версии корзины и доставки, поэтому описан как запрос с таким ключом:
 * изменилась корзина или адрес — создаётся новый расчёт, прежний не переиспользуется.
 * Расчёт действует 10 минут; раньше срока его перечитывать не нужно. Пока доставка не выбрана
 * (`body === null`), запрос не выполняется.
 */
export const quoteQuery = (body: QuoteBody | null) =>
  queryOptions({
    queryKey: keys.quote(body),
    queryFn: body ? ({ signal }) => api.quotes.create(body, signal) : skipToken,
    staleTime: 9 * MINUTE,
  });

export const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: keys.order(orderId),
    queryFn: ({ signal }) => api.orders.get(orderId, signal),
  });

/** Попытки оплаты, новые первыми. Пока последняя обрабатывается — опрашиваем; после итога — нет. */
export const paymentsQuery = (orderId: string) =>
  queryOptions({
    queryKey: keys.payments(orderId),
    queryFn: ({ signal }) => api.orders.payments(orderId, signal),
    refetchInterval: (query) =>
      query.state.data?.[0]?.status === 'processing' ? POLL_INTERVAL : false,
  });
