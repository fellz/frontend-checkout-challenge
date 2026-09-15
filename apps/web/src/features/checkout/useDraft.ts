import { useState, type FocusEvent } from 'react';
import type { PaymentMethod } from '@/api/types';
import { useStore } from '@/lib/storage';
import type { FieldErrors } from '@/lib/validate';
import {
  draftStore,
  emptyDraft,
  validateDraft,
  type DeliveryDraft,
  type Draft,
} from '@/features/checkout/draft';

/**
 * Черновик формы и ошибки полей. Черновик живёт в localStorage (переживает перезагрузку и
 * ошибки запросов); ошибка поля снимается при его изменении.
 */
export function useDraft() {
  const draft = useStore(draftStore) ?? emptyDraft;
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (next: Draft, key?: string) => {
    draftStore.set(next);
    if (key && key in errors) {
      const { [key]: _cleared, ...rest } = errors;
      setErrors(rest);
    }
  };

  return {
    draft,
    errors,
    setErrors,
    setCustomer(field: keyof Draft['customer'], value: string) {
      update({ ...draft, customer: { ...draft.customer, [field]: value } }, `customer/${field}`);
    },
    setDelivery(patch: Partial<DeliveryDraft>, key?: string) {
      update({ ...draft, delivery: { ...draft.delivery, ...patch } }, key);
    },
    setAddress(field: keyof DeliveryDraft['address'], value: string) {
      update(
        {
          ...draft,
          delivery: { ...draft.delivery, address: { ...draft.delivery.address, [field]: value } },
        },
        `delivery/address/${field}`,
      );
    },
    setPaymentMethod(paymentMethod: PaymentMethod) {
      update({ ...draft, paymentMethod });
    },
    /**
     * Проверка поля при потере фокуса — теми же правилами, что и при отправке.
     * Пустое поле не трогаем: иначе проход табом по форме сразу красит всё.
     */
    checkOnBlur: (key: string) => (event: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!event.target.value.trim()) return;
      const message = validateDraft(draft)[key];
      if (message) setErrors((previous) => ({ ...previous, [key]: message }));
    },
    /** Проверить всё; при ошибках показать их, поставить фокус на первую и вернуть false. */
    validate() {
      const found = validateDraft(draft);
      setErrors(found);
      const first = Object.keys(found)[0];
      if (first) document.getElementById(first)?.focus();
      return !first;
    },
    clear: () => draftStore.remove(),
  };
}

export type DraftForm = ReturnType<typeof useDraft>;
