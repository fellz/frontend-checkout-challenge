import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { quoteQuery } from '@/api/queries';
import { useDebounced } from '@/lib/useDebounced';
import { deliveryOf, type Draft } from '@/features/checkout/draft';

/**
 * Расчёт доставки для текущего черновика. Зависит от версии корзины и доставки; адрес берём
 * с задержкой, чтобы не считать на каждую букву. Пока доставка не заполнена — запроса нет.
 */
export function useQuote(draft: Draft, cartVersion: number) {
  const delivery = useDebounced(draft.delivery, 400);
  const body = useMemo(() => {
    const chosen = deliveryOf(delivery);
    return chosen && { cartVersion, delivery: chosen };
  }, [delivery, cartVersion]);
  const query = useQuery(quoteQuery(body));
  const ready = query.data !== undefined && !query.isFetching && delivery === draft.delivery;
  return {
    query,
    /** Доставка выбрана — расчёт запрошен или уже есть. */
    requested: body !== null,
    /** Расчёт, соответствующий тому, что сейчас в форме (debounce прошёл, запрос завершён). */
    current: ready ? query.data : null,
  };
}

export type QuoteState = ReturnType<typeof useQuote>;
