import { useMemo } from 'react';

/** Индекс списка по ключу: один проход при изменении списка вместо поиска на каждое обращение. */
export function indexBy<T, K>(items: readonly T[] | undefined, key: (item: T) => K): Map<K, T> {
  const index = new Map<K, T>();
  if (items) for (const item of items) index.set(key(item), item);
  return index;
}

export function useIndex<T, K>(items: readonly T[] | undefined, key: (item: T) => K) {
  return useMemo(() => indexBy(items, key), [items, key]);
}
