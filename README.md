# Магазин с оформлением заказа — решение тестового (React 19 + TypeScript, TanStack Query)

Фронтенд для готового REST API: каталог, корзина, оформление заказа, оплата тестовой картой
с повторами и отменой. Бэкенд, контракты и условия — от [instatdigital](https://github.com/instatdigital/frontend-checkout-challenge);
всё в `apps/web` — моё.

**Стек:** React 19 · TypeScript · Vite · react-router · TanStack Query · TypeBox-схемы из `@checkout/contracts`.

**Ключевые решения**

- Один транспорт `request(spec)`: статус, конверт `{data, meta, links}`, `ApiError {kind, status, code, fields}`, авто-пересоздание гостевой сессии на 401 — компоненты не видят `Response`.
- Вызовы API описаны как данные (`endpoints.ts`): путь, метод, тело, `Idempotency-Key`; ключ идемпотентности один и тот же для повтора той же операции (двойной клик, потеря ответа) и новый — для новой попытки.
- Состояние оплаты не хранится на клиенте: страница заказа читает заказ и попытки с сервера и опрашивает, пока последняя — `processing`; перезагрузка ничего не теряет.
- Проверка формы и ошибки полей из API приводятся к одним ключам через схемы контракта.

Устройство, проверенные сценарии и недоработки — в **[apps/web/README.md](apps/web/README.md)**.
Тот же интерфейс **без TanStack Query, со своим кэшем серверного состояния (~200 строк)** —
[frontend-checkout-challenge-plain](https://github.com/fellz/frontend-checkout-challenge-plain).
Второе тестовое из той же пары — канвас на React Flow: [frontend-canvas-challenge](https://github.com/fellz/frontend-canvas-challenge).

---

## Условия задания (от instatdigital)

Нужно сделать интерфейс магазина: каталог, корзину, оформление заказа и оплату тестовой картой. Бэкенд готов, фронтенд добавьте в `apps/web`.

Для отбора нужно выполнить оба тестовых: [оформление заказа](https://github.com/instatdigital/frontend-checkout-challenge) и [канвас на React Flow](https://github.com/instatdigital/frontend-canvas-challenge). Пришлите ссылки на оба решения.

[Условия задания](docs/ASSIGNMENT.md) · [Работа с API](docs/INTEGRATION.md) · [Критерии оценки](docs/EVALUATION.md)

Главный критерий — обобщение кода и минимум повторяющихся операций. Одинаковые проверки HTTP-ответов и разбор ошибок в компонентах недопустимы. Отдельно оцениваем стоимость обработки данных: лишние проходы, копирования и повторные поиски снижают результат.

## Запуск

Потребуются Node.js 24.x и npm 11.x. Отдельная база данных и ключи внешних сервисов не нужны.

```sh
git clone https://github.com/instatdigital/frontend-checkout-challenge.git
cd frontend-checkout-challenge
npm ci
npm run dev
```

Фронтенд — в отдельном терминале:

```sh
npm run dev:web      # http://localhost:5173
npm run build:web    # сборка в apps/web/dist
npm run preview:web  # просмотр собранного
```

Устройство фронтенда, принятые решения, проверенные сценарии и недоработки — в [apps/web/README.md](apps/web/README.md).

Swagger: [http://localhost:4000/docs/](http://localhost:4000/docs/). Спецификация: [http://localhost:4000/openapi.json](http://localhost:4000/openapi.json) или [файл в репозитории](docs/openapi.json).

В Swagger выполните `POST /api/sessions` с телом `{}`. Скопируйте `data.token` в **Authorize**, без слова `Bearer`.

## Структура

```text
apps/api/             бэкенд
apps/web/             ваш фронтенд
packages/contracts/   схемы API и типы TypeScript
docs/                 задание и документация
scripts/              проверки
```

Проект использует npm workspaces. Приложение в `apps/web` назовите `@checkout/web`. Добавьте команды запуска фронтенда в README своего решения. Пока его нет, `npm run dev` запускает только API.

## Проверки

```sh
npm run check       # форматирование, сборка, тесты и OpenAPI
npm run build
npm start           # запуск собранного бэкенда
```

При работающем API в другом терминале выполните `npm run smoke`. Эта команда проверяет покупку, отказ карты, отмену и повтор оплаты по HTTP.

## Настройки

Адрес по умолчанию — `127.0.0.1:4000`. Если порт занят, скопируйте `.env.example` в `.env` и измените `PORT`. Для проверки другого порта передайте `BASE_URL`, например `BASE_URL=http://localhost:4100 npm run smoke`.

Фронтенд может работать на любом HTTP-порту `localhost`, `127.0.0.1` или `[::1]`. Другие разрешённые адреса задаются в `CORS_ORIGINS`. Авторизация передаётся заголовком; cookies и `credentials: include` не нужны.

Данные сохраняются в `.data/store.json`. Запускайте один экземпляр API на один файл. Для сброса остановите сервер и выполните `npm run data:reset`; затем создайте новую сессию. Если меняли `DATA_FILE`, свой файл удалите вручную при остановленном сервере.

Товары и адреса вымышленные. Остаток ограничивает количество в одной корзине и не уменьшается у других покупателей. Для получателя используйте тестовые контакты, например `buyer@example.test`. Вместо ввода номера карты интерфейс должен предлагать тестовые карты из API.

Корневые команды сборки и тестов проверяют бэкенд. В решении добавьте отдельные команды запуска и сборки `apps/web`, а после установки его зависимостей обновите корневой `package-lock.json`. Схемы API в `packages/contracts` можно использовать напрямую или описать нужные типы у себя.
