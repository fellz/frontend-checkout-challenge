import type { DeliveryMethod, PickupPoint } from '@/api/types';
import { formatMoney } from '@/lib/money';
import type { DraftForm } from '@/features/checkout/useDraft';
import { Field, RadioGroup, SelectField } from '@/ui/Field';

function describeMethod(method: DeliveryMethod) {
  if (method.price === 0) return 'бесплатно';
  const free = method.freeFrom === null ? '' : `, бесплатно от ${formatMoney(method.freeFrom)}`;
  return `${formatMoney(method.price)}${free}`;
}

const ADDRESS_FIELDS = [
  { field: 'city', label: 'Город', autoComplete: 'address-level2' },
  { field: 'street', label: 'Улица', autoComplete: 'address-line1' },
  { field: 'house', label: 'Дом' },
  { field: 'apartment', label: 'Квартира', hint: 'Необязательно' },
] as const;

export function DeliveryFields({
  form,
  methods,
  pickupPoints,
}: {
  form: DraftForm;
  methods: readonly DeliveryMethod[];
  pickupPoints: readonly PickupPoint[] | undefined;
}) {
  const { draft, errors, setDelivery, setAddress, checkOnBlur } = form;
  return (
    <div className="card">
      <RadioGroup
        name="delivery/method"
        legend="Доставка"
        value={draft.delivery.method}
        options={methods.map((method) => ({
          value: method.id,
          label: method.title,
          description: describeMethod(method),
        }))}
        onChange={(method) => setDelivery({ method })}
      />
      {draft.delivery.method === 'pickup' ? (
        <SelectField
          id="delivery/pickupPointId"
          label="Пункт выдачи"
          value={draft.delivery.pickupPointId}
          onChange={(event) =>
            setDelivery({ pickupPointId: event.target.value }, 'delivery/pickupPointId')
          }
          error={errors['delivery/pickupPointId']}
        >
          <option value="">Выберите пункт</option>
          {pickupPoints?.map((point) => (
            <option key={point.id} value={point.id}>
              {point.title} — {point.address}
            </option>
          ))}
        </SelectField>
      ) : (
        <div className="address-grid">
          {ADDRESS_FIELDS.map(({ field, ...rest }) => (
            <Field
              key={field}
              id={`delivery/address/${field}`}
              {...rest}
              value={draft.delivery.address[field]}
              onChange={(event) => setAddress(field, event.target.value)}
              onBlur={checkOnBlur(`delivery/address/${field}`)}
              error={errors[`delivery/address/${field}`]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
