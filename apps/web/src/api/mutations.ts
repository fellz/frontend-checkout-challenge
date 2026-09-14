import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIdempotencyKey } from '@/lib/idempotency';
import { api } from '@/api/endpoints';
import { keys } from '@/api/queries';
import type { CartItem, CreateOrder, Scenario } from '@/api/types';

/** Позиция корзины: `set(0)` удаляет. После изменения корзину перечитывает сервер (итоги считает он). */
export function useCartItem(productId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (quantity: number): Promise<CartItem | void> =>
      quantity > 0 ? api.cart.setItem(productId, quantity) : api.cart.removeItem(productId),
    onSettled: () => client.invalidateQueries({ queryKey: keys.cart }),
  });
}

const orderKey = createIdempotencyKey('order');
const paymentKey = createIdempotencyKey('payment');

const createPayment = (orderId: string, after: string | null) =>
  api.orders.createPayment(orderId, paymentKey.for({ orderId, after })).then((payment) => {
    paymentKey.done();
    return payment;
  });

/**
 * Оформление: создать заказ и, для карты, сразу открыть первую попытку оплаты.
 * Если попытку открыть не удалось, заказ всё равно создан — на его странице есть кнопка «Оплатить».
 */
export function usePlaceOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateOrder) => {
      const order = await api.orders.create(body, orderKey.for(body));
      orderKey.done();
      if (order.paymentMethod === 'card')
        await createPayment(order.id, null).catch(() => undefined);
      return order;
    },
    // Корзина очищена сервером. Конфликты версии и расчёта обрабатывает queryClient.
    onSuccess: () => client.invalidateQueries({ queryKey: keys.cart }),
  });
}

/**
 * Ещё одна попытка оплаты. `after` — id предыдущей: повтор после отказа получает новый ключ,
 * а повтор того же создания (двойное нажатие, потеря ответа) — прежний.
 */
export function useCreatePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, after }: { orderId: string; after: string | null }) =>
      createPayment(orderId, after),
    onSuccess: (_payment, { orderId }) =>
      client.invalidateQueries({ queryKey: keys.order(orderId) }),
  });
}

/** Выбор сценария тестовой карты или отмена формы. Дальше статус опрашивает paymentsQuery. */
export function useSimulatePayment(orderId: string, paymentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (scenario: Scenario) => api.payments.simulate(paymentId, scenario),
    onSettled: () => client.invalidateQueries({ queryKey: keys.payments(orderId) }),
  });
}
