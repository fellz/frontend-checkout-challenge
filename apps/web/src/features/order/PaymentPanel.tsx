import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useCreatePayment, useSimulatePayment } from '../../api/mutations';
import { isFinalPayment, keys, paymentsQuery, sandboxQuery } from '../../api/queries';
import type { Order, Payment } from '../../api/types';
import { formatMoney } from '../../lib/money';
import { Async } from '../../ui/Async';
import { Button } from '../../ui/Button';
import { RadioGroup } from '../../ui/Field';
import { ErrorNotice, Notice } from '../../ui/Notice';
import { Loading } from '../../ui/Spinner';

/**
 * Оплата картой. Состояние берётся только с сервера: последняя попытка определяет, что показать —
 * форму, ожидание или итог с кнопкой новой попытки. Поэтому перезагрузка ничего не теряет.
 */
export function PaymentPanel({ order }: { order: Order }) {
  const client = useQueryClient();
  const payments = useQuery(paymentsQuery(order.id));
  const attempt = payments.data?.[0];
  const create = useCreatePayment();
  const retry = () => create.mutate({ orderId: order.id, after: attempt?.id ?? null });

  // Опрашиваем попытку, а не заказ; когда попытка завершилась, а заказ ещё «pending» — перечитываем заказ.
  const lagging = isFinalPayment(attempt) && order.paymentStatus === 'pending';
  useEffect(() => {
    if (lagging) void client.invalidateQueries({ queryKey: keys.order(order.id) });
  }, [lagging, client, order.id]);

  return (
    <section className="card payment" aria-live="polite">
      <h2>Оплата</h2>
      <Async query={payments} loading="Проверяем оплату…">
        {() =>
          attempt?.status === 'pending' ? (
            <PaymentForm order={order} attempt={attempt} />
          ) : attempt?.status === 'processing' || lagging ? (
            <Loading label="Ждём подтверждение банка… Страницу можно перезагрузить." />
          ) : (
            <>
              {attempt?.status === 'failed' && (
                <Notice kind="error">
                  Банк отклонил оплату
                  {attempt.failureCode === 'CARD_DECLINED' && ' (карта отклонена)'}. Попробуйте
                  другую карту.
                </Notice>
              )}
              {attempt?.status === 'cancelled' && (
                <Notice kind="warning">
                  Оплата отменена. Заказ сохранён — можно оплатить снова.
                </Notice>
              )}
              {create.isError && <ErrorNotice error={create.error} onRetry={retry} />}
              <Button onClick={retry} pending={create.isPending}>
                {attempt ? 'Оплатить снова' : 'Оплатить'} {formatMoney(order.total)}
              </Button>
            </>
          )
        }
      </Async>
    </section>
  );
}

/** Тестовая платёжная форма: карта выбирается по названию и маске, номер и CVC не вводятся. */
function PaymentForm({ order, attempt }: { order: Order; attempt: Payment }) {
  const sandbox = useQuery(sandboxQuery);
  const simulate = useSimulatePayment(order.id, attempt.id);
  const [cardId, setCardId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | undefined>();
  const cancelling = simulate.isPending && simulate.variables === 'cancel';
  const paying = simulate.isPending && !cancelling;

  return (
    <Async query={sandbox} loading="Открываем платёжную форму…">
      {({ cards }) => {
        const selected = cardId ?? cards[0]?.id ?? null;
        const pay = () => {
          const card = cards.find((item) => item.id === selected);
          if (!card) return setCardError('Выберите карту');
          setCardError(undefined);
          simulate.mutate(card.scenario);
        };
        return (
          <div className="payment-form">
            <p className="muted">
              Тестовая оплата: настоящие данные карты не нужны — выберите сценарий.
            </p>
            <RadioGroup
              name="card"
              legend="Карта"
              value={selected}
              options={cards.map((card) => ({
                value: card.id,
                label: card.title,
                description: card.maskedNumber,
              }))}
              onChange={setCardId}
              error={cardError}
              disabled={simulate.isPending}
            />
            {simulate.isError && <ErrorNotice error={simulate.error} onRetry={pay} />}
            <div className="actions">
              <Button onClick={pay} pending={paying} disabled={cancelling}>
                Оплатить {formatMoney(attempt.amount)}
              </Button>
              <Button
                variant="secondary"
                onClick={() => simulate.mutate('cancel')}
                pending={cancelling}
                disabled={paying}
              >
                Отменить оплату
              </Button>
            </div>
          </div>
        );
      }}
    </Async>
  );
}
