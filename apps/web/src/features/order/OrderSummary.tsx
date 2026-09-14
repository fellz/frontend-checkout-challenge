import type { CartItem, Delivery, PickupPoint } from '@/api/types';
import { Money } from '@/ui/Money';

/** Состав и итоги: используется в оформлении (из расчёта) и на странице заказа. */
export function OrderSummary({
  items,
  subtotal,
  shipping,
  total,
  delivery,
  pickupPoints,
}: {
  items: readonly CartItem[];
  subtotal: number;
  shipping?: number;
  total?: number;
  delivery?: Delivery;
  pickupPoints?: ReadonlyMap<string, PickupPoint>;
}) {
  return (
    <div className="summary">
      <ul className="summary-items">
        {items.map((item) => (
          <li key={item.productId}>
            <span className="summary-title">
              {item.title} <span className="muted">× {item.quantity}</span>
            </span>
            <Money value={item.lineTotal} />
          </li>
        ))}
      </ul>
      {delivery && (
        <p className="summary-delivery">
          {delivery.method === 'pickup'
            ? describePickup(delivery.pickupPointId, pickupPoints)
            : describeAddress(delivery.address)}
        </p>
      )}
      <dl className="summary-totals">
        <dt>Товары</dt>
        <dd>
          <Money value={subtotal} />
        </dd>
        <dt>Доставка</dt>
        <dd>
          {shipping === undefined ? '—' : shipping === 0 ? 'бесплатно' : <Money value={shipping} />}
        </dd>
        <dt className="summary-total">Итого</dt>
        <dd className="summary-total">{total === undefined ? '—' : <Money value={total} />}</dd>
      </dl>
    </div>
  );
}

function describePickup(pointId: string, points?: ReadonlyMap<string, PickupPoint>) {
  const point = points?.get(pointId);
  return point ? `Самовывоз: ${point.title}, ${point.address}` : `Самовывоз: ${pointId}`;
}

function describeAddress(address: Extract<Delivery, { method: 'courier' }>['address']) {
  const flat = address.apartment ? `, кв. ${address.apartment}` : '';
  return `Курьер: ${address.city}, ${address.street}, ${address.house}${flat}`;
}
