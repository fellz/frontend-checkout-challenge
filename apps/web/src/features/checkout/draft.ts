import { AddressSchema, CustomerSchema } from '@checkout/contracts';
import { Value } from '@sinclair/typebox/value';
import type { Address, Customer, Delivery, PaymentMethod } from '../../api/types';
import { createStore } from '../../lib/storage';
import { trimmed, validate, type FieldErrors } from '../../lib/validate';

export type DeliveryDraft = {
  method: Delivery['method'];
  pickupPointId: string;
  address: Required<Address>;
};

export type Draft = {
  customer: Customer;
  delivery: DeliveryDraft;
  paymentMethod: PaymentMethod;
};

export const emptyDraft: Draft = {
  customer: { name: '', email: '', phone: '' },
  delivery: {
    method: 'pickup',
    pickupPointId: '',
    address: { city: '', street: '', house: '', apartment: '' },
  },
  paymentMethod: 'card',
};

/** Черновик формы переживает перезагрузку и ошибки запросов. */
export const draftStore = createStore<Draft>('checkout.draft');

/** Доставка для API, когда черновик заполнен корректно; иначе null — расчёт ещё невозможен. */
export function deliveryOf(draft: DeliveryDraft): Delivery | null {
  if (draft.method === 'pickup')
    return draft.pickupPointId ? { method: 'pickup', pickupPointId: draft.pickupPointId } : null;
  const address = trimmed(draft.address);
  return Value.Check(AddressSchema, address) ? { method: 'courier', address } : null;
}

/** Ошибки полей всего черновика по схемам контракта; пустой объект — можно отправлять. */
export function validateDraft(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  validate(CustomerSchema, trimmed(draft.customer), 'customer', errors);
  if (draft.delivery.method === 'courier')
    validate(AddressSchema, trimmed(draft.delivery.address), 'delivery/address', errors);
  else if (!draft.delivery.pickupPointId)
    errors['delivery/pickupPointId'] = 'Выберите пункт выдачи';
  return errors;
}
