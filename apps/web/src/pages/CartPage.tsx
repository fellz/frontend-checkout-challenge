import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { cartQuery, productsQuery } from '../api/queries';
import type { Product } from '../api/types';
import { useIndex } from '../lib';
import { Async } from '../ui/Async';
import { Money } from '../ui/Money';
import { ErrorNotice, Notice } from '../ui/Notice';
import { CartControls } from '../features/cart/CartControls';

const byId = (product: Product) => product.id;

export function CartPage() {
  const cart = useQuery(cartQuery);
  const products = useQuery(productsQuery);
  // Остаток товара нужен для максимума счётчика; в позиции корзины его нет.
  const catalog = useIndex(products.data, byId);
  return (
    <section>
      <h1>Корзина</h1>
      {products.isError && (
        <ErrorNotice
          error={products.error}
          onRetry={products.refetch}
          pending={products.isFetching}
        />
      )}
      <Async query={cart} loading="Загружаем корзину…">
        {(data) =>
          data.items.length === 0 ? (
            <Notice action={<Link to="/">Перейти в каталог</Link>}>Корзина пуста.</Notice>
          ) : (
            <div className="cart-layout">
              <ul className="cart-list">
                {data.items.map((item) => {
                  const product = catalog.get(item.productId);
                  return (
                    <li key={item.productId} className="card cart-line">
                      <div className="cart-line-info">
                        <span className="cart-line-title">{item.title}</span>
                        <span className="muted">
                          <Money value={item.unitPrice} /> за шт.
                        </span>
                      </div>
                      {product ? (
                        <CartControls product={product} item={item} removable />
                      ) : (
                        <span className="muted">× {item.quantity}</span>
                      )}
                      <Money value={item.lineTotal} />
                    </li>
                  );
                })}
              </ul>
              <aside className="card cart-total">
                <dl className="summary-totals">
                  <dt>Товаров</dt>
                  <dd>{data.quantity} шт.</dd>
                  <dt className="summary-total">Сумма</dt>
                  <dd className="summary-total">
                    <Money value={data.subtotal} />
                  </dd>
                </dl>
                <p className="muted">Стоимость доставки рассчитывается при оформлении.</p>
                <Link to="/checkout" className="btn btn-primary btn-md btn-block">
                  Оформить заказ
                </Link>
              </aside>
            </div>
          )
        }
      </Async>
    </section>
  );
}
