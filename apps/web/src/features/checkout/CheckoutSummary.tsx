import type { Cart, PaymentMethod, PickupPoint } from '@/api/types';
import type { CheckoutState } from '@/features/checkout/useCheckout';
import type { QuoteState } from '@/features/checkout/useQuote';
import { OrderSummary } from '@/features/order/OrderSummary';
import { Button } from '@/ui/Button';
import { ErrorNotice, Notice } from '@/ui/Notice';
import { Loading } from '@/ui/Spinner';

/** Состав, расчёт доставки, состояние отправки и кнопка. */
export function CheckoutSummary({
  cart,
  quote,
  checkout,
  paymentMethod,
  pickupPoints,
  onRetry,
}: {
  cart: Cart;
  quote: QuoteState;
  checkout: CheckoutState;
  paymentMethod: PaymentMethod;
  pickupPoints: ReadonlyMap<string, PickupPoint>;
  onRetry: () => void;
}) {
  const { query } = quote;
  return (
    <aside className="card checkout-summary">
      <h2>Ваш заказ</h2>
      <OrderSummary
        items={cart.items}
        subtotal={cart.subtotal}
        shipping={query.data?.shipping}
        total={query.data?.total}
        delivery={query.data?.delivery}
        pickupPoints={pickupPoints}
      />
      {!quote.requested ? (
        <p className="muted">Выберите способ доставки, чтобы рассчитать итог.</p>
      ) : query.isError ? (
        <ErrorNotice error={query.error} onRetry={query.refetch} pending={query.isFetching} />
      ) : (
        !quote.current && <Loading label="Считаем доставку…" />
      )}
      {checkout.stale && (
        <Notice kind="warning">
          Корзина или расчёт изменились: состав и сумма обновлены. Проверьте заказ и подтвердите ещё
          раз.
        </Notice>
      )}
      {checkout.error && (
        <ErrorNotice error={checkout.error} onRetry={onRetry} pending={checkout.pending} />
      )}
      <Button type="submit" pending={checkout.pending} className="btn-block">
        {paymentMethod === 'card' ? 'Перейти к оплате' : 'Оформить заказ'}
      </Button>
    </aside>
  );
}
