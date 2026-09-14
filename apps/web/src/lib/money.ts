const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Суммы API — в копейках. */
export const formatMoney = (kopecks: number) => rub.format(kopecks / 100);
