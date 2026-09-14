import { useCartItem } from '../../api/mutations';
import type { Product, CartItem } from '../../api/types';
import { Button } from '../../ui/Button';
import { ErrorNotice } from '../../ui/Notice';
import { Stepper } from '../../ui/Stepper';

/**
 * Кнопка «В корзину» либо счётчик количества для товара — одно поведение в каталоге и корзине.
 * Максимум — остаток товара; превышение и недоступный товар сервер отклоняет, ошибка показывается тут же.
 */
export function CartControls({
  product,
  item,
  removable = false,
}: {
  product: Product;
  item: CartItem | undefined;
  removable?: boolean;
}) {
  const mutation = useCartItem(product.id);
  const available = product.stock > 0;
  return (
    <div className="cart-controls">
      {item ? (
        <Stepper
          value={item.quantity}
          max={product.stock}
          label={product.title}
          pending={mutation.isPending}
          onChange={mutation.mutate}
          onRemove={() => mutation.mutate(0)}
        />
      ) : (
        <Button
          onClick={() => mutation.mutate(1)}
          pending={mutation.isPending}
          disabled={!available}
        >
          {available ? 'В корзину' : 'Нет в наличии'}
        </Button>
      )}
      {removable && item && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutation.mutate(0)}
          pending={mutation.isPending}
        >
          Удалить
        </Button>
      )}
      {mutation.isError && <ErrorNotice error={mutation.error} />}
    </div>
  );
}
