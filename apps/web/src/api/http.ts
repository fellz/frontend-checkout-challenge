import type { ApiError as ApiErrorBody, ApiResult } from '@checkout/contracts';
import { session } from './session';

export const API_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

export type RequestSpec = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Путь относительно API_URL, например `/api/cart`. */
  path: string;
  /** Сериализуется в JSON; для `{}` отправляется пустой объект, как требует API. */
  body?: unknown;
  /** Дополнительные заголовки, например Idempotency-Key. */
  headers?: Record<string, string>;
  /** Передавать токен сессии. По умолчанию — да. */
  auth?: boolean;
  signal?: AbortSignal;
};

export type ApiResponse<T> = {
  status: number;
  data: T;
  links: ApiResult<T>['links'];
  requestId: string | null;
};

export type ErrorKind = 'network' | 'http' | 'parse' | 'aborted';
export type FieldIssue = { path: string; message: string };

/** Единый вид любой неудачи запроса: сеть, HTTP-статус, неразборчивое тело, отмена. */
export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status: number | null;
  readonly code: string;
  readonly fields: readonly FieldIssue[];
  readonly requestId: string | null;

  constructor(
    kind: ErrorKind,
    message: string,
    extra: {
      status?: number;
      code?: string;
      fields?: FieldIssue[];
      requestId?: string | null;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = extra.status ?? null;
    this.code = extra.code ?? kind.toUpperCase();
    this.fields = extra.fields ?? [];
    this.requestId = extra.requestId ?? null;
  }

  /** Повтор того же запроса может помочь: сеть или ошибка сервера. */
  get retryable() {
    return this.kind === 'network' || (this.status !== null && this.status >= 500);
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
export const isRetryable = (error: unknown) => isApiError(error) && error.retryable;
/** Ошибка с конкретным кодом API, например `CART_VERSION_CONFLICT`. */
export const hasCode = (error: unknown, ...codes: string[]) =>
  isApiError(error) && codes.includes(error.code);

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Сессия не найдена. Обновите страницу.',
  404: 'Данные не найдены.',
  409: 'Данные изменились. Обновите страницу и повторите.',
  500: 'Ошибка сервера. Попробуйте ещё раз.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isErrorBody = (value: unknown): value is ApiErrorBody =>
  isRecord(value) && isRecord(value.error) && typeof value.error.message === 'string';
const isEnvelope = (value: unknown): value is ApiResult<unknown> =>
  isRecord(value) && 'data' in value;

async function send(spec: RequestSpec, token: string | null): Promise<Response> {
  const headers = new Headers(spec.headers);
  headers.set('Accept', 'application/json');
  if (spec.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    return await fetch(API_URL + spec.path, {
      method: spec.method ?? 'GET',
      headers,
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      signal: spec.signal,
    });
  } catch (cause) {
    if (spec.signal?.aborted) throw new ApiError('aborted', 'Запрос отменён.');
    throw new ApiError('network', 'Нет связи с сервером. Проверьте сеть и повторите.');
  }
}

async function parse<T>(response: Response): Promise<ApiResponse<T>> {
  const { status } = response;
  const requestId = response.headers.get('X-Request-Id');
  let text: string;
  try {
    text = status === 204 ? '' : await response.text();
  } catch {
    throw new ApiError('network', 'Соединение прервано при получении ответа.', { requestId });
  }
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError('parse', 'Сервер вернул нечитаемый ответ.', { status, requestId });
    }
  }
  if (!response.ok) {
    const error = isErrorBody(body) ? body.error : undefined;
    throw new ApiError('http', error?.message ?? STATUS_MESSAGES[status] ?? `Ошибка ${status}.`, {
      status,
      code: error?.code ?? `HTTP_${status}`,
      fields: error?.fields,
      requestId,
    });
  }
  if (status === 204) return { status, data: undefined as T, links: {}, requestId };
  if (!isEnvelope(body))
    throw new ApiError('parse', 'Ответ сервера не соответствует контракту.', { status, requestId });
  return { status, data: body.data as T, links: body.links, requestId };
}

let creating: Promise<string> | null = null;

/** Гостевая сессия создаётся один раз даже при параллельных первых запросах. */
function createSession(): Promise<string> {
  creating ??= request<{ token: string }>({
    method: 'POST',
    path: '/api/sessions',
    body: {},
    auth: false,
  })
    .then(({ data }) => {
      session.set(data.token);
      return data.token;
    })
    .finally(() => {
      creating = null;
    });
  return creating;
}

/**
 * Единственная точка отправки запросов: адрес, заголовки, тело, сессия, статус,
 * пустой ответ, разбор конверта `{ data, meta, links }` и приведение ошибок к ApiError.
 * Если API не узнал токен (сброс данных), сессия создаётся заново и запрос повторяется один раз.
 */
export async function request<T>(spec: RequestSpec, renewed = false): Promise<ApiResponse<T>> {
  const auth = spec.auth ?? true;
  const token = auth ? (session.get() ?? (await createSession())) : null;
  const response = await send(spec, token);
  if (response.status === 401 && auth && !renewed) {
    if (session.get() === token) session.remove();
    return request<T>(spec, true);
  }
  return parse<T>(response);
}

/** То же, что request, но только полезные данные — для большинства вызовов. */
export const data = <T>(spec: RequestSpec) => request<T>(spec).then((response) => response.data);
