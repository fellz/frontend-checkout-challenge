import type { DraftForm } from '@/features/checkout/useDraft';
import { Field } from '@/ui/Field';

export function CustomerFields({ form }: { form: DraftForm }) {
  const { draft, errors, setCustomer, checkOnBlur } = form;
  return (
    <fieldset className="card">
      <legend>Получатель</legend>
      <Field
        id="customer/name"
        label="Имя"
        autoComplete="name"
        value={draft.customer.name}
        onChange={(event) => setCustomer('name', event.target.value)}
        onBlur={checkOnBlur('customer/name')}
        error={errors['customer/name']}
      />
      <Field
        id="customer/email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={draft.customer.email}
        onChange={(event) => setCustomer('email', event.target.value)}
        onBlur={checkOnBlur('customer/email')}
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
        onChange={(event) => setCustomer('phone', event.target.value)}
        onBlur={checkOnBlur('customer/phone')}
        error={errors['customer/phone']}
        hint="В формате +79990000000"
      />
    </fieldset>
  );
}
