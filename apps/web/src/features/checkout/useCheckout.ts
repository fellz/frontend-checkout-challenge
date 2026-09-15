import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { hasCode } from '@/api/http';
import { usePlaceOrder } from '@/api/mutations';
import { fieldErrorsOf, trimmed } from '@/lib/validate';
import type { DraftForm } from '@/features/checkout/useDraft';
import type { QuoteState } from '@/features/checkout/useQuote';
import { activeOrder } from '@/features/order/activeOrder';

/** Отправка заказа: проверка формы, ожидание расчёта, создание заказа и переход к нему. */
export function useCheckout(form: DraftForm, quote: QuoteState) {
  const navigate = useNavigate();
  const placeOrder = usePlaceOrder();
  // Отправка запрошена, пока расчёт ещё не готов: заказ создастся, как только он появится.
  const [armed, setArmed] = useState(false);
  // Данные обновились после конфликта; сообщение живёт до следующей отправки.
  const [stale, setStale] = useState(false);

  const place = (quoteId: string) =>
    placeOrder.mutate(
      { quoteId, customer: trimmed(form.draft.customer), paymentMethod: form.draft.paymentMethod },
      {
        onSuccess: (order) => {
          form.clear();
          activeOrder.set({ id: order.id, number: order.number });
          void navigate(`/orders/${order.id}`);
        },
        onError: (error) => form.setErrors(fieldErrorsOf(error)),
      },
    );

  // Конфликт версии или устаревший расчёт: queryClient уже перечитал данные, здесь только сообщаем.
  const conflict =
    hasCode(quote.query.error, 'CART_VERSION_CONFLICT') ||
    hasCode(placeOrder.error, 'CART_VERSION_CONFLICT', 'QUOTE_EXPIRED', 'QUOTE_NOT_FOUND');
  useEffect(() => {
    if (conflict) setStale(true);
  }, [conflict]);

  useEffect(() => {
    if (!armed) return;
    if (quote.current) {
      setArmed(false);
      place(quote.current.id);
    } else if (quote.query.isError) setArmed(false);
  });

  return {
    submit(event: SubmitEvent<HTMLFormElement>) {
      event.preventDefault();
      setStale(false);
      if (!form.validate()) return;
      if (quote.current) place(quote.current.id);
      else setArmed(true);
    },
    pending: armed || placeOrder.isPending,
    stale,
    /** Ошибка создания заказа, кроме конфликтов — о них говорит `stale`. */
    error: placeOrder.isError && !conflict ? placeOrder.error : null,
  };
}

export type CheckoutState = ReturnType<typeof useCheckout>;
