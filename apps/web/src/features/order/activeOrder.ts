import { createStore } from '@/lib/storage';

/** Заказ, оформление которого ещё не завершено: чтобы после перезагрузки вернуться к оплате. */
export const activeOrder = createStore<{ id: string; number: string }>('checkout.activeOrder');
