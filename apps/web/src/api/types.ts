import type { Static } from '@sinclair/typebox';
import type * as C from '@checkout/contracts';

export type {
  Cart,
  Customer,
  Delivery,
  Order,
  Payment,
  Product,
  Quote,
  Scenario,
  Simulation,
  CreateOrder,
} from '@checkout/contracts';

export type CartItem = Static<typeof C.CartItemSchema>;
export type Address = Static<typeof C.AddressSchema>;
export type PaymentMethod = Static<typeof C.PaymentMethodSchema>;
export type CheckoutOptions = Static<typeof C.CheckoutOptionsSchema>;
export type DeliveryMethod = CheckoutOptions['deliveryMethods'][number];
export type PickupPoint = DeliveryMethod['pickupPoints'][number];
export type QuoteBody = Static<typeof C.QuoteBody>;
export type Sandbox = Static<typeof C.SandboxSchema>;
export type TestCard = Sandbox['cards'][number];
