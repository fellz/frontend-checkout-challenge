import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { checkoutOptionsQuery, orderQuery } from '@/api/queries';
import type { CheckoutOptions, Order, PickupPoint } from '@/api/types';
import { useIndex } from '@/lib';
import { Async } from '@/ui/Async';
import { Notice } from '@/ui/Notice';
import { activeOrder } from '@/features/order/activeOrder';
import { OrderSummary } from '@/features/order/OrderSummary';
import { PaymentPanel } from '@/features/order/PaymentPanel';

const STATUS_LABELS: Record<Order['status'], string> = {
  awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  confirmed: 'Оформлен',
};

export function OrderPage() {
  const { orderId = '' } = useParams();
  const order = useQuery(orderQuery(orderId));
  return (
    <section>
      <Async query={order} loading="Загружаем заказ…">
        {(data) => <OrderView order={data} />}
      </Async>
      {order.isError && (
        <p>
          <Link to="/">Вернуться в каталог</Link>
        </p>
      )}
    </section>
  );
}

const byId = (point: PickupPoint) => point.id;
const pickupPointsOf = (options: CheckoutOptions) =>
  options.deliveryMethods.find((method) => method.id === 'pickup')?.pickupPoints;

function OrderView({ order }: { order: Order }) {
  // Названия пунктов выдачи есть только в условиях доставки; берём из кэша, если уже загружены.
  const options = useQuery({ ...checkoutOptionsQuery, select: pickupPointsOf });
  const pickupPoints = useIndex(options.data, byId);

  const cash = order.paymentMethod === 'cash_on_delivery';
  const done = cash || order.status === 'paid';
  useEffect(() => {
    if (done && activeOrder.get()?.id === order.id) activeOrder.remove();
  }, [done, order.id]);

  return (
    <div className="order-layout">
      <div>
        <h1>
          Заказ {order.number}{' '}
          <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
        </h1>
        {cash ? (
          <Notice kind="success">Заказ оформлен, оплата при получении.</Notice>
        ) : order.status === 'paid' ? (
          <Notice kind="success">
            Оплата прошла. Заказ {order.number} оплачен и принят в работу.
          </Notice>
        ) : (
          <PaymentPanel order={order} />
        )}
        <div className="card">
          <h2>Получатель</h2>
          <p>
            {order.customer.name}
            <br />
            {order.customer.email}, {order.customer.phone}
          </p>
        </div>
        {done && (
          <p>
            <Link to="/">В каталог</Link>
          </p>
        )}
      </div>
      <aside className="card">
        <h2>Состав заказа</h2>
        <OrderSummary
          items={order.items}
          subtotal={order.subtotal}
          shipping={order.shipping}
          total={order.total}
          delivery={order.delivery}
          pickupPoints={pickupPoints}
        />
      </aside>
    </div>
  );
}
