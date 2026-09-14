import { data } from '@/api/http';
import type {
  Cart,
  CartItem,
  CheckoutOptions,
  CreateOrder,
  Order,
  Payment,
  Product,
  Quote,
  QuoteBody,
  Sandbox,
  Scenario,
  Simulation,
} from '@/api/types';

const idempotent = (key: string) => ({ 'Idempotency-Key': key });
const item = (productId: string) => `/api/cart/items/${encodeURIComponent(productId)}`;

/** Описание вызовов API: только путь, метод, тело и заголовки. Всё общее — в http.ts. */
export const api = {
  products: (signal?: AbortSignal) =>
    data<Product[]>({ path: '/api/products', auth: false, signal }),
  sandbox: (signal?: AbortSignal) => data<Sandbox>({ path: '/api/sandbox', auth: false, signal }),
  cart: {
    get: (signal?: AbortSignal) => data<Cart>({ path: '/api/cart', signal }),
    setItem: (productId: string, quantity: number) =>
      data<CartItem>({ method: 'PUT', path: item(productId), body: { quantity } }),
    removeItem: (productId: string) => data<void>({ method: 'DELETE', path: item(productId) }),
  },
  checkoutOptions: (signal?: AbortSignal) =>
    data<CheckoutOptions>({ path: '/api/checkout/options', signal }),
  quotes: {
    create: (body: QuoteBody, signal?: AbortSignal) =>
      data<Quote>({ method: 'POST', path: '/api/quotes', body, signal }),
  },
  orders: {
    create: (body: CreateOrder, key: string) =>
      data<Order>({ method: 'POST', path: '/api/orders', body, headers: idempotent(key) }),
    get: (orderId: string, signal?: AbortSignal) =>
      data<Order>({ path: `/api/orders/${orderId}`, signal }),
    payments: (orderId: string, signal?: AbortSignal) =>
      data<Payment[]>({ path: `/api/orders/${orderId}/payments`, signal }),
    createPayment: (orderId: string, key: string) =>
      data<Payment>({
        method: 'POST',
        path: `/api/orders/${orderId}/payments`,
        body: {},
        headers: idempotent(key),
      }),
  },
  payments: {
    simulate: (paymentId: string, scenario: Scenario) =>
      data<Simulation>({
        method: 'POST',
        path: `/api/payments/${paymentId}/simulations`,
        body: { scenario },
      }),
  },
};
