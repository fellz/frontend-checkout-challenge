import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Link } from 'react-router';
import { checkoutOptionsQuery } from '@/api/queries';
import type { CheckoutOptions, PickupPoint } from '@/api/types';
import { useIndex } from '@/lib';
import { Async } from '@/ui/Async';
import { Notice } from '@/ui/Notice';
import { CheckoutSummary } from '@/features/checkout/CheckoutSummary';
import { CustomerFields } from '@/features/checkout/CustomerFields';
import { DeliveryFields } from '@/features/checkout/DeliveryFields';
import { PaymentFields } from '@/features/checkout/PaymentFields';
import { useCheckout } from '@/features/checkout/useCheckout';
import { useDraft } from '@/features/checkout/useDraft';
import { useQuote } from '@/features/checkout/useQuote';

export function CheckoutPage() {
  const options = useQuery(checkoutOptionsQuery);
  return (
    <section>
      <h1>Оформление заказа</h1>
      <Async query={options} loading="Загружаем условия доставки…">
        {(data) =>
          data.cart.items.length === 0 ? (
            <Notice action={<Link to="/">Перейти в каталог</Link>}>
              Корзина пуста — оформлять пока нечего.
            </Notice>
          ) : (
            <CheckoutForm options={data} />
          )
        }
      </Async>
    </section>
  );
}

const byId = (point: PickupPoint) => point.id;

function CheckoutForm({ options }: { options: CheckoutOptions }) {
  const form = useDraft();
  const quote = useQuote(form.draft, options.cart.version);
  const checkout = useCheckout(form, quote);
  const element = useRef<HTMLFormElement>(null);
  const pickupPoints = options.deliveryMethods.find(
    (method) => method.id === 'pickup',
  )?.pickupPoints;
  const pointsById = useIndex(pickupPoints, byId);

  return (
    <form ref={element} className="checkout-layout" onSubmit={checkout.submit} noValidate>
      <div className="checkout-form">
        <CustomerFields form={form} />
        <DeliveryFields form={form} methods={options.deliveryMethods} pickupPoints={pickupPoints} />
        <PaymentFields form={form} methods={options.paymentMethods} />
      </div>
      <CheckoutSummary
        cart={options.cart}
        quote={quote}
        checkout={checkout}
        paymentMethod={form.draft.paymentMethod}
        pickupPoints={pointsById}
        onRetry={() => element.current?.requestSubmit()}
      />
    </form>
  );
}
