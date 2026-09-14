import { useQuery } from '@tanstack/react-query';
import { cartQuery, productsQuery } from '../api/queries';
import type { CartItem, Product } from '../api/types';
import { useIndex } from '../lib';
import { Async } from '../ui/Async';
import { Money } from '../ui/Money';
import { ErrorNotice } from '../ui/Notice';
import { CartControls } from '../features/cart/CartControls';

const byProductId = (item: CartItem) => item.productId;

export function CatalogPage() {
  const products = useQuery(productsQuery);
  const cart = useQuery(cartQuery);
  // Индекс позиций корзины строится один раз на изменение корзины, а не find() в каждой карточке.
  const inCart = useIndex(cart.data?.items, byProductId);
  return (
    <section>
      <h1>Каталог</h1>
      {cart.isError && (
        <ErrorNotice error={cart.error} onRetry={cart.refetch} pending={cart.isFetching} />
      )}
      <Async query={products} loading="Загружаем каталог…">
        {(list) => (
          <ul className="grid">
            {list.map((product) => (
              <ProductCard key={product.id} product={product} item={inCart.get(product.id)} />
            ))}
          </ul>
        )}
      </Async>
    </section>
  );
}

function ProductCard({ product, item }: { product: Product; item: CartItem | undefined }) {
  return (
    <li className={`card product${product.stock === 0 ? ' product-unavailable' : ''}`}>
      <h2 className="product-title">{product.title}</h2>
      <p className="muted">{product.description}</p>
      <p className="product-price">
        <Money value={product.price} />
        <small className="muted">
          {product.stock > 0 ? ` в наличии ${product.stock} шт.` : ' нет в наличии'}
        </small>
      </p>
      <CartControls product={product} item={item} />
    </li>
  );
}
