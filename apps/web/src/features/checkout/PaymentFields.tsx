import type { CheckoutOptions } from '@/api/types';
import type { DraftForm } from '@/features/checkout/useDraft';
import { RadioGroup } from '@/ui/Field';

export function PaymentFields({
  form,
  methods,
}: {
  form: DraftForm;
  methods: CheckoutOptions['paymentMethods'];
}) {
  return (
    <div className="card">
      <RadioGroup
        name="paymentMethod"
        legend="Оплата"
        value={form.draft.paymentMethod}
        options={methods.map((method) => ({ value: method.id, label: method.title }))}
        onChange={form.setPaymentMethod}
      />
    </div>
  );
}
