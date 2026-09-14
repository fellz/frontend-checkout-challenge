import type { KeyboardEvent, FocusEvent } from 'react';
import { Button } from '@/ui/Button';

/**
 * Количество с кнопками «−/+» и полем ввода. Кнопки применяют сразу, поле — по Enter или потере
 * фокуса. При `value <= min` кнопка «−» вызывает `onRemove`, если он задан.
 */
export function Stepper({
  value,
  min = 1,
  max,
  label,
  pending = false,
  onChange,
  onRemove,
}: {
  value: number;
  min?: number;
  max: number;
  label: string;
  pending?: boolean;
  onChange: (value: number) => void;
  onRemove?: () => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (raw: string) => {
    const next = Number.parseInt(raw, 10);
    if (!Number.isFinite(next)) return;
    const clamped = clamp(next);
    if (clamped !== value) onChange(clamped);
  };
  const decrease = value <= min ? onRemove : () => onChange(value - 1);
  return (
    <div className="stepper" aria-busy={pending || undefined}>
      <Button
        variant="secondary"
        size="sm"
        onClick={decrease}
        disabled={pending || !decrease}
        aria-label={value <= min && onRemove ? `Убрать: ${label}` : `Меньше: ${label}`}
      >
        −
      </Button>
      <input
        key={value}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        defaultValue={value}
        disabled={pending}
        aria-label={`Количество: ${label}`}
        onBlur={(e: FocusEvent<HTMLInputElement>) => commit(e.currentTarget.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(e.currentTarget.value);
          }
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(value + 1)}
        disabled={pending || value >= max}
        aria-label={`Больше: ${label}`}
      >
        +
      </Button>
    </div>
  );
}
