import { createStore } from '@/lib/storage';

/**
 * Токен гостевой сессии. Создание и обновление токена делает транспорт (http.ts) —
 * здесь только хранение и подписка, чтобы кэш запросов мог сброситься при смене сессии.
 */
export const session = createStore<string>('checkout.session');
