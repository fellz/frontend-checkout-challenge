import { FormatRegistry, type TSchema } from '@sinclair/typebox';
import { Value, ValueErrorType, type ValueError } from '@sinclair/typebox/value';
import { isApiError } from '../api/http';

// Контракт использует format: 'email'; TypeBox не поставляет форматы — регистрируем один раз.
FormatRegistry.Set('email', (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

/** Ошибки полей формы: ключ — путь поля через `/`, как в `error.fields[].path` API без `body/`. */
export type FieldErrors = Record<string, string>;

/** Подсказки формата для полей, у которых текст из схемы неинформативен. */
const FORMAT_HINTS: Record<string, string> = {
  'customer/email': 'Укажите email, например buyer@example.test',
  'customer/phone': 'Телефон в формате +79990000000 (10–15 цифр)',
};

const EMPTY = 'Заполните поле';

function describe(error: ValueError, key: string): string {
  switch (error.type) {
    case ValueErrorType.ObjectRequiredProperty:
    case ValueErrorType.String:
      return EMPTY;
    case ValueErrorType.StringMinLength:
      return error.value === '' ? EMPTY : `Минимум ${error.schema.minLength} символа`;
    case ValueErrorType.StringMaxLength:
      return `Не больше ${error.schema.maxLength} символов`;
    case ValueErrorType.StringPattern:
      // Шаблон `\S` в контракте означает «не только пробелы».
      return error.schema.pattern === '\\S' ? EMPTY : (FORMAT_HINTS[key] ?? 'Неверный формат');
    case ValueErrorType.StringFormat:
      return FORMAT_HINTS[key] ?? 'Неверный формат';
    default:
      return 'Проверьте значение';
  }
}

/**
 * Проверяет значение по схеме контракта и дописывает первую ошибку каждого поля в `errors`
 * под ключом `prefix + путь`. Возвращает, было ли значение корректным.
 */
export function validate(schema: TSchema, value: unknown, prefix: string, errors: FieldErrors) {
  let valid = true;
  for (const error of Value.Errors(schema, value)) {
    const key = prefix + error.path;
    if (!(key in errors)) errors[key] = describe(error, key);
    valid = false;
  }
  return valid;
}

/** Ошибки полей из ответа API (400 VALIDATION_ERROR) в том же виде, что и локальные. */
export function fieldErrorsOf(error: unknown): FieldErrors {
  const errors: FieldErrors = {};
  if (isApiError(error))
    for (const issue of error.fields) {
      const key = issue.path.replace(/^body\//, '');
      errors[key] ??= FORMAT_HINTS[key] ?? 'Проверьте значение';
    }
  return errors;
}

/** Обрезает пробелы в строковых полях и выбрасывает пустые необязательные строки. */
export function trimmed<T extends Record<string, string | undefined>>(value: T): T {
  const result = {} as Record<string, string | undefined>;
  for (const key in value) {
    const text = value[key]?.trim();
    if (text) result[key] = text;
  }
  return result as T;
}
