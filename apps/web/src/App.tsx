import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { cartQuery } from './api/queries';
import type { Cart } from './api/types';
import { useStore } from './lib/storage';
import { Notice } from './ui/Notice';
import { activeOrder } from './features/order/activeOrder';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderPage } from './pages/OrderPage';

const quantityOf = (cart: Cart) => cart.quantity;

function Header() {
  // select: шапка перерисовывается только при смене количества, а не любого поля корзины.
  const cart = useQuery({ ...cartQuery, select: quantityOf });
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          Демо-магазин
        </Link>
        <nav aria-label="Основная навигация">
          <NavLink to="/" end>
            Каталог
          </NavLink>
          <NavLink to="/cart">
            Корзина{cart.data ? <span className="count">{cart.data}</span> : null}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

/** Напоминание о заказе, оплата которого не завершена, — на всех страницах, кроме его собственной. */
function ActiveOrderBanner() {
  const order = useStore(activeOrder);
  const { pathname } = useLocation();
  if (!order || pathname === `/orders/${order.id}`) return null;
  return (
    <Notice kind="warning" action={<Link to={`/orders/${order.id}`}>Перейти к оплате</Link>}>
      Заказ {order.number} ждёт оплаты.
    </Notice>
  );
}

export function App() {
  return (
    <>
      <Header />
      <main className="container">
        <ActiveOrderBanner />
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:orderId" element={<OrderPage />} />
          <Route
            path="*"
            element={<Notice action={<Link to="/">В каталог</Link>}>Страница не найдена.</Notice>}
          />
        </Routes>
      </main>
    </>
  );
}
