import type { ComponentProps, ReactNode } from 'react';

type ShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (aria: {
    id: string;
    'aria-invalid': true | undefined;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

/** Подпись, поле, подсказка и ошибка, связанные через id/aria — общее для всех полей. */
function FieldShell({ id, label, error, hint, children }: ShellProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type FieldProps = Omit<ComponentProps<'input'>, 'id'> & Omit<ShellProps, 'children'>;

export function Field({ id, label, error, hint, ...input }: FieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {(aria) => <input {...input} {...aria} />}
    </FieldShell>
  );
}

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & Omit<ShellProps, 'children'>;

export function SelectField({ id, label, error, hint, children, ...select }: SelectProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {(aria) => (
        <select {...select} {...aria}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export type RadioOption<V extends string> = { value: V; label: ReactNode; description?: ReactNode };

/** Группа переключателей с общей подписью; работает с клавиатуры как обычные radio. */
export function RadioGroup<V extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  error,
  disabled,
}: {
  name: string;
  legend: string;
  value: V | null;
  options: readonly RadioOption<V>[];
  onChange: (value: V) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className={`radio-group${error ? ' field-invalid' : ''}`} disabled={disabled}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="radio">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            aria-invalid={error ? true : undefined}
          />
          <span>
            <span className="radio-label">{option.label}</span>
            {option.description && <span className="radio-description">{option.description}</span>}
          </span>
        </label>
      ))}
      {error && (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
