import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { hasCode } from '../api/http';
import { usePlaceOrder } from '../api/mutations';
import { checkoutOptionsQuery, quoteQuery } from '../api/queries';
import type { CheckoutOptions, DeliveryMethod, PickupPoint } from '../api/types';
import { useIndex } from '../lib';
import { formatMoney } from '../lib/money';
import { useStore } from '../lib/storage';
import { useDebounced } from '../lib/useDebounced';
import { fieldErrorsOf, trimmed, type FieldErrors } from '../lib/validate';
import { Async } from '../ui/Async';
import { Button } from '../ui/Button';
import { Field, RadioGroup, SelectField } from '../ui/Field';
import { ErrorNotice, Notice } from '../ui/Notice';
import { Loading } from '../ui/Spinner';
import { activeOrder } from '../features/order/activeOrder';
import { OrderSummary } from '../features/order/OrderSummary';
import {
  deliveryOf,
  draftStore,
  emptyDraft,
  validateDraft,
  type Draft,
} from '../features/checkout/draft';

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

function describeMethod(method: DeliveryMethod) {
  if (method.price === 0) return 'бесплатно';
  const free = method.freeFrom === null ? '' : `, бесплатно от ${formatMoney(method.freeFrom)}`;
  return `${formatMoney(method.price)}${free}`;
}

function CheckoutForm({ options }: { options: CheckoutOptions }) {
  const navigate = useNavigate();
  const draft = useStore(draftStore) ?? emptyDraft;
  const [errors, setErrors] = useState<FieldErrors>({});
  // Отправка запрошена, пока расчёт ещё не готов: заказ создастся, как только он появится.
  const [armed, setArmed] = useState(false);
  // Сообщение о том, что данные обновились после конфликта; живёт до следующей отправки.
  const [stale, setStale] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const pickup = options.deliveryMethods.find((method) => method.id === 'pickup');
  const pickupPoints = useIndex(pickup?.pickupPoints, byId);

  // Расчёт зависит от версии корзины и доставки; адрес берём с задержкой, чтобы не считать на каждую букву.
  const delivery = useDebounced(draft.delivery, 400);
  const quoteBody = useMemo(() => {
    const chosen = deliveryOf(delivery);
    return chosen && { cartVersion: options.cart.version, delivery: chosen };
  }, [delivery, options.cart.version]);
  const quote = useQuery(quoteQuery(quoteBody));

  const placeOrder = usePlaceOrder();

  const update = (next: Draft, key?: string) => {
    draftStore.set(next);
    if (key && key in errors) {
      const { [key]: _cleared, ...rest } = errors;
      setErrors(rest);
    }
  };
  const customerInput =
    (field: keyof Draft['customer']) => (event: ChangeEvent<HTMLInputElement>) =>
      update(
        { ...draft, customer: { ...draft.customer, [field]: event.target.value } },
        `customer/${field}`,
      );
  const addressInput =
    (field: keyof Draft['delivery']['address']) => (event: ChangeEvent<HTMLInputElement>) =>
      update(
        {
          ...draft,
          delivery: {
            ...draft.delivery,
            address: { ...draft.delivery.address, [field]: event.target.value },
          },
        },
        `delivery/address/${field}`,
      );

  useEffect(() => {
    const first = Object.keys(errors)[0];
    if (first) document.getElementById(first)?.focus();
  }, [errors]);

  const quoteReady = quote.data !== undefined && !quote.isFetching && delivery === draft.delivery;

  const place = (quoteId: string) =>
    placeOrder.mutate(
      { quoteId, customer: trimmed(draft.customer), paymentMethod: draft.paymentMethod },
      {
        onSuccess: (order) => {
          draftStore.remove();
          activeOrder.set({ id: order.id, number: order.number });
          void navigate(`/orders/${order.id}`);
        },
        onError: (error) => setErrors(fieldErrorsOf(error)),
      },
    );

  // Конфликт версии или устаревший расчёт: queryClient уже перечитал данные, здесь только сообщаем.
  const conflict =
    hasCode(quote.error, 'CART_VERSION_CONFLICT') ||
    hasCode(placeOrder.error, 'CART_VERSION_CONFLICT', 'QUOTE_EXPIRED', 'QUOTE_NOT_FOUND');
  useEffect(() => {
    if (conflict) setStale(true);
  }, [conflict]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStale(false);
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (quoteReady) place(quote.data.id);
    else setArmed(true);
  };

  useEffect(() => {
    if (!armed) return;
    if (quoteReady) {
      setArmed(false);
      place(quote.data.id);
    } else if (quote.isError) setArmed(false);
  });

  const pending = armed || placeOrder.isPending;

  return (
    <form ref={form} className="checkout-layout" onSubmit={submit} noValidate>
      <div className="checkout-form">
        <fieldset className="card">
          <legend>Получатель</legend>
          <Field
            id="customer/name"
            label="Имя"
            autoComplete="name"
            value={draft.customer.name}
            onChange={customerInput('name')}
            error={errors['customer/name']}
          />
          <Field
            id="customer/email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={draft.customer.email}
            onChange={customerInput('email')}
            error={errors['customer/email']}
            hint="Например, buyer@example.test"
          />
          <Field
            id="customer/phone"
            label="Телефон"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={draft.customer.phone}
            onChange={customerInput('phone')}
            error={errors['customer/phone']}
            hint="В формате +79990000000"
          />
        </fieldset>

        <div className="card">
          <RadioGroup
            name="delivery/method"
            legend="Доставка"
            value={draft.delivery.method}
            options={options.deliveryMethods.map((method) => ({
              value: method.id,
              label: method.title,
              description: describeMethod(method),
            }))}
            onChange={(method) => update({ ...draft, delivery: { ...draft.delivery, method } })}
          />
          {draft.delivery.method === 'pickup' ? (
            <SelectField
              id="delivery/pickupPointId"
              label="Пункт выдачи"
              value={draft.delivery.pickupPointId}
              onChange={(event) =>
                update(
                  {
                    ...draft,
                    delivery: { ...draft.delivery, pickupPointId: event.target.value },
                  },
                  'delivery/pickupPointId',
                )
              }
              error={errors['delivery/pickupPointId']}
            >
              <option value="">Выберите пункт</option>
              {pickup?.pickupPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.title} — {point.address}
                </option>
              ))}
            </SelectField>
          ) : (
            <div className="address-grid">
              <Field
                id="delivery/address/city"
                label="Город"
                autoComplete="address-level2"
                value={draft.delivery.address.city}
                onChange={addressInput('city')}
                error={errors['delivery/address/city']}
              />
              <Field
                id="delivery/address/street"
                label="Улица"
                autoComplete="address-line1"
                value={draft.delivery.address.street}
                onChange={addressInput('street')}
                error={errors['delivery/address/street']}
              />
              <Field
                id="delivery/address/house"
                label="Дом"
                value={draft.delivery.address.house}
                onChange={addressInput('house')}
                error={errors['delivery/address/house']}
              />
              <Field
                id="delivery/address/apartment"
                label="Квартира"
                value={draft.delivery.address.apartment}
                onChange={addressInput('apartment')}
                error={errors['delivery/address/apartment']}
                hint="Необязательно"
              />
            </div>
          )}
        </div>

        <div className="card">
          <RadioGroup
            name="paymentMethod"
            legend="Оплата"
            value={draft.paymentMethod}
            options={options.paymentMethods.map((method) => ({
              value: method.id,
              label: method.title,
            }))}
            onChange={(paymentMethod) => update({ ...draft, paymentMethod })}
          />
        </div>
      </div>

      <aside className="card checkout-summary">
        <h2>Ваш заказ</h2>
        <OrderSummary
          items={options.cart.items}
          subtotal={options.cart.subtotal}
          shipping={quote.data?.shipping}
          total={quote.data?.total}
          delivery={quote.data?.delivery}
          pickupPoints={pickupPoints}
        />
        {quoteBody === null ? (
          <p className="muted">Выберите способ доставки, чтобы рассчитать итог.</p>
        ) : quote.isError ? (
          <ErrorNotice error={quote.error} onRetry={quote.refetch} pending={quote.isFetching} />
        ) : (
          !quoteReady && <Loading label="Считаем доставку…" />
        )}
        {stale && (
          <Notice kind="warning">
            Корзина или расчёт изменились: состав и сумма обновлены. Проверьте заказ и подтвердите
            ещё раз.
          </Notice>
        )}
        {placeOrder.isError && !conflict && (
          <ErrorNotice
            error={placeOrder.error}
            onRetry={() => form.current?.requestSubmit()}
            pending={pending}
          />
        )}
        <Button type="submit" pending={pending} className="btn-block">
          {draft.paymentMethod === 'card' ? 'Перейти к оплате' : 'Оформить заказ'}
        </Button>
      </aside>
    </form>
  );
}
