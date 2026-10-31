import { z } from 'zod';
import {
  shoppingCartViewOutput,
  getOrCreateCartInput,
  createOrderInput,
  orderTargetInput,
  persistentCartOperationInput,
  orderViewOutput,
  orderSummaryOutput,
  searchInput,
  productInput,
  type ShoppingCartView,
  type OrderView,
  type OrderSummary,
  type ProductSummary,
  type ProductDetail,
} from '@store/contracts';
export type EntryTool =
  | 'search_products'
  | 'get_product'
  | 'get_or_create_cart'
  | 'get_cart'
  | 'add_cart_item'
  | 'update_cart_item'
  | 'remove_cart_item'
  | 'create_order'
  | 'get_order'
  | 'list_orders'
  | 'cancel_order';
export type Tool =
  | EntryTool
  | 'quote_selection'
  | 'apps_get_or_create_cart'
  | 'apps_create_order'
  | 'apps_pay_order';
export interface Bridge {
  call(name: Tool, args: Record<string, unknown>): Promise<unknown>;
  open(url: string): Promise<{ isError?: boolean }>;
  canOpen(): boolean;
}
export type Storage = Pick<
  globalThis.Storage,
  'getItem' | 'setItem' | 'removeItem'
>;
type Pending = { name: Tool; args: Record<string, unknown>; target: string };
export interface ViewState {
  instanceId: string;
  cart: ShoppingCartView | null;
  order: OrderView | null;
  orders: OrderView[];
  nextOffset: number | null;
  products: (ProductSummary | ProductDetail)[];
  draft: Record<string, string>;
  selected: string[];
  quote: OrderSummary | null;
  busy: boolean;
  dirty: boolean;
  needsRefresh: boolean;
  pending: Pending | null;
  confirmCartId: string | null;
  message: string;
}
const product = z
  .object({
    id: z.string(),
    name: z.string(),
    brand: z.string(),
    category: z.string(),
    currency: z.literal('TWD'),
    price: z.string().regex(/^\d+\.\d{2}$/),
    imagePath: z.null(),
    availability: z.object({
      canPurchase: z.boolean(),
      reasons: z.array(
        z.enum([
          'SOLD_OUT',
          'INVENTORY_ANOMALY',
          'PRICE_PENDING',
          'INVENTORY_UNAVAILABLE',
        ]),
      ),
      currentQuantity: z.number().int().nullable(),
    }),
  })
  .strict();
const detail = product
  .extend({
    description: z.string(),
    specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    reviewOverview: z.object({ count: z.number().int().nonnegative() }),
  })
  .strict();
const page = z
  .object({
    items: z.array(product),
    total: z.number().int().nonnegative(),
    nextOffset: z.number().int().nullable(),
    catalogRevision: z.string(),
  })
  .strict();
class ToolFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
function dataOf(raw: unknown) {
  const r = z
    .object({
      structuredContent: z.object({
        ok: z.boolean(),
        data: z.unknown().optional(),
        error: z.object({ code: z.string() }).optional(),
      }),
      isError: z.boolean().optional(),
    })
    .parse(raw);
  if (!r.structuredContent.ok || r.isError)
    throw new ToolFailure(r.structuredContent.error?.code ?? 'UNKNOWN');
  return r.structuredContent.data;
}
const pendingSchema = z.object({
  name: z.enum([
    'apps_get_or_create_cart',
    'apps_create_order',
    'add_cart_item',
    'update_cart_item',
    'remove_cart_item',
    'apps_pay_order',
    'cancel_order',
  ]),
  args: z.record(z.string(), z.unknown()),
  target: z.string(),
});
const listSchema = z.object({
  items: z.array(orderViewOutput),
  nextOffset: z.number().nullable(),
});
const currentKey = 'store.apps.currentCartId';
const pendingKey = (target: string) => `store.apps.pending.${target}`;
const terminal = (o: OrderView) => o.status === 'PAID' || o.closedAt !== null;
export function validateOrderLink(
  value: string,
  origin: string,
  id: string,
  share: boolean,
) {
  const u = new URL(value);
  if (
    u.origin !== origin ||
    u.pathname !== `/orders/${id}` ||
    u.search !== (share ? '?view=share' : '') ||
    u.hash ||
    u.username ||
    u.password
  )
    throw new ToolFailure('UNSAFE_LINK');
  return u.href;
}
export class StoreController {
  #state: ViewState = {
    instanceId: crypto.randomUUID(),
    cart: null,
    order: null,
    orders: [],
    nextOffset: null,
    products: [],
    draft: {},
    selected: [],
    quote: null,
    busy: false,
    dirty: false,
    needsRefresh: false,
    pending: null,
    confirmCartId: null,
    message: '',
  };
  #listeners = new Set<() => void>();
  #alive = true;
  #generation = 0;
  #quoteSequence = 0;
  #target = '';
  #orderTarget: string | null = null;
  #reconciled = new Set<string>();
  #corrupt = new Set<string>();
  #cardTarget: string | null = null;
  #foregroundTarget: string | null = null;
  #orders = new Map<string, OrderView>();
  #reads = new Map<string, number>();
  #conflicts = new Set<string>();
  #writes = new Set<string>();
  constructor(
    readonly entry: EntryTool,
    private bridge: Bridge,
    private origin: string,
    private storage?: Storage,
    private cardId?: string,
  ) {}
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => {
    this.#listeners.add(fn);
    return () => {
      this.#listeners.delete(fn);
    };
  };
  #set(patch: Partial<ViewState>) {
    if (!this.#alive) return;
    this.#state = { ...this.#state, ...patch };
    for (const fn of this.#listeners) fn();
  }
  #get(key: string) {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  #persist(key: string, value: unknown) {
    try {
      if (!this.storage) throw Error();
      this.storage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
      return true;
    } catch {
      this.#set({
        message: '無法保存原請求，已停止寫入；請檢查 Host 會話儲存。',
      });
      return false;
    }
  }
  #restore(target: string) {
    const raw = this.#get(pendingKey(target));
    if (!raw) return null;
    try {
      const p = pendingSchema.parse(JSON.parse(raw));
      if (p.target !== target) throw Error();
      if (p.name === 'apps_pay_order' || p.name === 'cancel_order') {
        if (orderTargetInput.parse(p.args).orderId !== target) throw Error();
      } else if (p.name === 'apps_get_or_create_cart') {
        const args = getOrCreateCartInput.parse(p.args);
        if ('cartId' in args) throw Error();
      } else {
        const { cartId, ...body } = p.args;
        if (z.uuid().parse(cartId) !== target) throw Error();
        if (p.name === 'apps_create_order') createOrderInput.parse(body);
        else {
          const { productId, quantity, ...context } = body;
          persistentCartOperationInput.parse({
            ...context,
            operation: {
              type:
                p.name === 'add_cart_item'
                  ? 'add_item'
                  : p.name === 'update_cart_item'
                    ? 'set_quantity'
                    : 'remove_item',
              productId,
              ...(p.name === 'remove_cart_item' ? {} : { quantity }),
            },
          });
          if (p.name === 'remove_cart_item' && quantity !== undefined)
            throw Error();
        }
      }
      return p;
    } catch {
      this.#corrupt.add(target);
      this.#set({
        needsRefresh: true,
        message: '原請求材料無效，不能安全重試。',
      });
      return null;
    }
  }
  #switch(target: string) {
    this.#generation++;
    this.#orderTarget = null;
    this.#target = target;
    const pending = this.#restore(target);
    this.#set({
      order: null,
      cart: null,
      draft: {},
      dirty: false,
      selected: [],
      quote: null,
      orders: [],
      nextOffset: null,
      busy: this.#writes.has(target),
      needsRefresh: this.#corrupt.has(target),
      pending,
      confirmCartId: null,
    });
  }
  #acceptCart(cart: ShoppingCartView, force = false) {
    if (this.#target !== cart.cartId) return;
    const old = this.#state.cart;
    if (old && cart.cartVersion < old.cartVersion) return;
    if (!force && this.#state.dirty) {
      this.#set({
        needsRefresh: true,
        message: '其他入口內容已變更；請放棄草稿並重新載入。',
      });
      return;
    }
    const selected =
      old && cart.cartVersion <= old.cartVersion + 1
        ? this.#state.selected.filter((id) =>
            cart.items.some(
              (i) =>
                i.productId === id &&
                old.items.some(
                  (o) => o.productId === id && o.quantity === i.quantity,
                ),
            ),
          )
        : [];
    this.#set({ cart, selected, quote: null });
  }
  #acceptOrder(o: OrderView) {
    const old = this.#orders.get(o.orderId);
    if (old && terminal(old)) {
      if (!terminal(o)) return old;
      if (old.status !== o.status || old.closeReason !== o.closeReason) {
        this.#conflicts.add(o.orderId);
        this.#set({ message: '訂單終態不一致，請只讀重新查詢。' });
        return old;
      }
    }
    this.#orders.set(o.orderId, o);
    if (terminal(o)) {
      try {
        this.storage?.removeItem(pendingKey(o.orderId));
      } catch {
        /* A retained terminal marker is harmless; fresh reads still prohibit writes. */
      }
    }
    return o;
  }
  prepareInput(input: unknown) {
    void input;
    /* Complete results are validated before any target transition. */
  }
  #cartKey(target: string) {
    return this.cardId
      ? `store.apps.cart.${this.entry}.${this.cardId}.${target}`
      : null;
  }
  #createdKey(target: string) {
    return this.cardId
      ? `store.apps.created.${this.entry}.${this.cardId}.${target}`
      : null;
  }
  async receive(
    input: unknown,
    raw: unknown,
    toolInfoName?: string,
    toolCallId?: string | number,
  ) {
    if (toolCallId !== undefined)
      this.cardId = `${typeof toolCallId}:${toolCallId}`;
    if (!this.#alive) return;
    try {
      if (toolInfoName && toolInfoName !== this.entry)
        throw new ToolFailure('WRONG_TOOL');
      const data = dataOf(raw);
      const args = z
        .object({ cartId: z.uuid().optional(), orderId: z.uuid().optional() })
        .passthrough()
        .parse(input ?? {});
      if (this.entry === 'search_products' || this.entry === 'get_product') {
        let products: (ProductSummary | ProductDetail)[];
        if (this.entry === 'search_products') {
          searchInput.parse(input ?? {});
          products = page.parse(data).items;
        } else {
          const d = detail.parse(data);
          if (
            input !== undefined &&
            productInput.parse(input).productId !== d.id
          )
            throw Error();
          products = [d];
        }
        const target = `catalog:${this.entry}:${JSON.stringify(input ?? (this.entry === 'get_product' ? { productId: products[0].id } : {}))}`;
        this.#cardTarget = target;
        const key = this.#createdKey(target),
          created = key ? this.#get(key) : null;
        if (created) {
          if (!z.uuid().safeParse(created).success) throw Error();
          await this.openOrder(created);
          return;
        }
        const cartKey = this.#cartKey(target),
          originalCart = cartKey ? this.#get(cartKey) : null;
        if (originalCart) {
          if (!z.uuid().safeParse(originalCart).success) throw Error();
          this.#switch(originalCart);
          await this.reload();
          return;
        }
        this.#switch(target);
        this.#set({ products, message: '' });
        return;
      }
      if (['get_order', 'cancel_order', 'create_order'].includes(this.entry)) {
        const result =
          this.entry === 'create_order'
            ? z
                .object({
                  order: orderViewOutput,
                  cart: shoppingCartViewOutput,
                })
                .parse(data)
            : null;
        const o = result?.order ?? orderViewOutput.parse(data);
        if (
          (args.orderId && args.orderId !== o.orderId) ||
          (args.cartId && args.cartId !== o.cartId) ||
          (result && result.cart.cartId !== o.cartId)
        )
          throw Error();
        await this.openOrder(o.orderId);
        return;
      }
      if (this.entry === 'list_orders') {
        if (!args.cartId) throw Error();
        this.#switch(args.cartId);
        const list = listSchema.parse(data);
        if (list.items.some((o) => o.cartId !== args.cartId)) throw Error();
        await this.reload();
        await this.listOrders();
        return;
      }
      const cart = shoppingCartViewOutput.parse(data);
      if (args.cartId && args.cartId !== cart.cartId) throw Error();
      if (this.#state.dirty || this.#state.busy) {
        this.#set({
          needsRefresh: true,
          message: '收到其他入口結果；請保留草稿並明確重新載入。',
        });
        return;
      }
      this.#cardTarget = cart.cartId;
      const createdKey = this.#createdKey(cart.cartId);
      const originalOrderId = createdKey ? this.#get(createdKey) : null;
      if (originalOrderId) {
        if (!z.uuid().safeParse(originalOrderId).success) throw Error();
        await this.openOrder(originalOrderId);
        return;
      }
      if (this.#target !== cart.cartId) this.#switch(cart.cartId);
      this.#acceptCart(cart);
      if (!this.#get(currentKey)) this.#persist(currentKey, cart.cartId);
      await this.reload();
    } catch {
      this.#set({
        needsRefresh: true,
        message: '工具資料無效或目標不符，請重新讀取原目標。',
      });
    }
  }
  async reload(discard = false) {
    if (!this.#alive || this.#state.busy) return;
    if (this.#state.dirty && !discard) {
      this.#set({ message: '請明確放棄調整並重新載入。' });
      return;
    }
    if (this.#orderTarget) {
      await this.#readOrder(this.#orderTarget);
      return;
    }
    if (!z.uuid().safeParse(this.#target).success) {
      this.#set({ message: '缺少原購物車或訂單 ID，無法恢復。' });
      return;
    }
    const target = this.#target,
      g = this.#generation;
    this.#set({ busy: true });
    try {
      const cart = shoppingCartViewOutput.parse(
        dataOf(await this.bridge.call('get_cart', { cartId: target })),
      );
      if (cart.cartId !== target) throw Error();
      if (g !== this.#generation) return;
      this.#acceptCart(cart, true);
      this.#set({
        draft: {},
        dirty: false,
        needsRefresh: this.#corrupt.has(target),
        pending: this.#restore(target),
        message: '',
      });
      await this.#quote();
    } catch {
      if (g === this.#generation)
        this.#set({
          needsRefresh: true,
          message: '讀取結果未知；請重新讀取原目標。',
        });
    } finally {
      if (g === this.#generation) this.#set({ busy: false });
      await this.#drainForeground();
    }
  }
  async openOrder(id: string) {
    if (!z.uuid().safeParse(id).success) return;
    this.#switch(id);
    this.#orderTarget = id;
    this.#set({ order: this.#orders.get(id) ?? null });
    await this.#readOrder(id);
  }
  async #readOrder(id: string) {
    const seq = (this.#reads.get(id) ?? 0) + 1;
    this.#reads.set(id, seq);
    const g = this.#generation;
    this.#set({ busy: true });
    try {
      const o = orderViewOutput.parse(
        dataOf(await this.bridge.call('get_order', { orderId: id })),
      );
      if (o.orderId !== id) throw Error();
      if (this.#reads.get(id) !== seq) return;
      const prior = this.#orders.get(id);
      if (
        prior &&
        terminal(prior) &&
        prior.status === o.status &&
        prior.closeReason === o.closeReason
      )
        this.#conflicts.delete(id);
      const accepted = this.#acceptOrder(o);
      if (this.#target === id) {
        this.#set({
          order: accepted,
          pending: this.#restore(id),
          needsRefresh: this.#conflicts.has(id) || this.#corrupt.has(id),
          message: this.#conflicts.has(id)
            ? '終態有矛盾，禁止重複操作；請重新查詢。'
            : '',
        });
      }
    } catch {
      if (this.#target === id)
        this.#set({
          needsRefresh: true,
          message: '原訂單讀取未知，保留已知結果。',
        });
    } finally {
      if (g === this.#generation) this.#set({ busy: this.#writes.has(id) });
      await this.#drainForeground();
      if (this.#conflicts.has(id) && !this.#reconciled.has(id)) {
        this.#reconciled.add(id);
        await this.#readOrder(id);
      }
    }
  }
  change(id: string, value: string) {
    if (
      !this.#state.cart ||
      this.#state.busy ||
      this.#state.pending ||
      this.#state.needsRefresh
    )
      return;
    this.#quoteSequence++;
    this.#set({
      draft: { ...this.#state.draft, [id]: value },
      dirty: true,
      quote: null,
    });
  }
  async save(id: string) {
    const value = this.#state.draft[id];
    if (value === undefined) return;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
      this.#set({ message: '數量須為 1 至 2147483647 的整數。' });
      return;
    }
    await this.#cartWrite(
      'update_cart_item',
      { productId: id, quantity: Number(value) },
      true,
    );
  }
  async remove(id: string) {
    await this.#cartWrite('remove_cart_item', { productId: id });
  }
  async add(id: string) {
    if (
      this.#state.busy ||
      this.#state.pending ||
      this.#state.dirty ||
      this.#state.needsRefresh
    )
      return;
    let current = this.#get(currentKey);
    if (current) {
      try {
        current = JSON.parse(current) as string;
      } catch {
        /* Older plain ID is accepted below. */
      }
    }
    if (!current) {
      await this.#write({
        name: 'apps_get_or_create_cart',
        target: this.#target,
        args: {
          requestId: crypto.randomUUID(),
          initialItems: [{ productId: id, quantity: 1 }],
        },
      });
      return;
    }
    if (this.#target !== current) {
      this.#switch(current);
      await this.reload();
    }
    await this.#cartWrite('add_cart_item', { productId: id, quantity: 1 });
  }
  async #cartWrite(name: Tool, body: Record<string, unknown>, save = false) {
    const s = this.#state;
    if (!s.cart || s.busy || s.pending || s.needsRefresh || (s.dirty && !save))
      return;
    await this.#write({
      name,
      target: s.cart.cartId,
      args: {
        cartId: s.cart.cartId,
        operationRequestId: crypto.randomUUID(),
        expectedCartVersion: s.cart.cartVersion,
        ...body,
      },
    });
  }
  async select(id: string, checked: boolean) {
    if (
      !this.#state.cart ||
      this.#state.busy ||
      this.#state.dirty ||
      this.#state.pending ||
      this.#state.needsRefresh
    )
      return;
    const selected = new Set(this.#state.selected);
    if (checked) selected.add(id);
    else selected.delete(id);
    this.#set({ selected: [...selected], quote: null });
    await this.#quote();
  }
  async selectAll(checked: boolean) {
    if (
      !this.#state.cart ||
      this.#state.busy ||
      this.#state.dirty ||
      this.#state.pending ||
      this.#state.needsRefresh
    )
      return;
    this.#set({
      selected: checked ? this.#state.cart.items.map((i) => i.productId) : [],
      quote: null,
    });
    await this.#quote();
  }
  #selection() {
    return this.#state
      .cart!.items.filter((i) => this.#state.selected.includes(i.productId))
      .map((i) => ({ productId: i.productId, expectedQuantity: i.quantity }));
  }
  async #quote() {
    const cart = this.#state.cart;
    const seq = ++this.#quoteSequence;
    if (!cart || !this.#state.selected.length) return;
    const g = this.#generation,
      version = cart.cartVersion;
    try {
      const quote = orderSummaryOutput.parse(
        dataOf(
          await this.bridge.call('quote_selection', {
            cartId: cart.cartId,
            selectedItems: this.#selection(),
            constraints: { currency: 'TWD' },
          }),
        ),
      );
      if (
        seq === this.#quoteSequence &&
        g === this.#generation &&
        this.#state.cart?.cartVersion === version &&
        !this.#state.dirty
      )
        this.#set({ quote });
    } catch {
      if (seq === this.#quoteSequence && g === this.#generation)
        this.#set({ quote: null, message: '選中預估不可用；請核對商品問題。' });
    }
  }
  async checkout() {
    const s = this.#state;
    if (
      !s.cart ||
      s.busy ||
      s.pending ||
      s.dirty ||
      s.needsRefresh ||
      !s.selected.length
    )
      return;
    await this.#write({
      name: 'apps_create_order',
      target: s.cart.cartId,
      args: {
        cartId: s.cart.cartId,
        requestId: crypto.randomUUID(),
        expectedCartVersion: s.cart.cartVersion,
        selectedItems: this.#selection(),
        constraints: { currency: 'TWD' },
      },
    });
  }
  async pay() {
    const s = this.#state,
      o = s.order;
    if (
      !o ||
      s.busy ||
      s.pending ||
      s.needsRefresh ||
      !o.allowedActions.canPay ||
      Date.parse(o.reservationExpiresAt) <= Date.now()
    )
      return;
    await this.#write({
      name: 'apps_pay_order',
      target: o.orderId,
      args: { orderId: o.orderId },
    });
  }
  async cancel() {
    const s = this.#state,
      o = s.order;
    if (
      !o ||
      s.busy ||
      s.pending ||
      s.needsRefresh ||
      !o.allowedActions.canCancel
    )
      return;
    await this.#write({
      name: 'cancel_order',
      target: o.orderId,
      args: { orderId: o.orderId },
    });
  }
  async retry() {
    const p = this.#state.pending;
    if (
      !p ||
      this.#state.busy ||
      this.#state.dirty ||
      this.#conflicts.has(p.target)
    )
      return;
    if (this.#state.order && terminal(this.#state.order)) return;
    await this.#write(p);
  }
  async #write(p: Pending) {
    const existing = this.#restore(p.target);
    if (this.#corrupt.has(p.target)) return;
    if (
      existing &&
      (existing.name !== p.name ||
        existing.target !== p.target ||
        JSON.stringify(existing.args) !== JSON.stringify(p.args))
    ) {
      this.#set({
        pending: existing,
        needsRefresh: true,
        message: '另一張卡片有未確認原操作；請恢復該原請求。',
      });
      return;
    }
    if (this.#writes.has(p.target) || !this.#persist(pendingKey(p.target), p))
      return;
    const g = this.#generation;
    const originalCreatedKey = this.#createdKey(this.#cardTarget ?? p.target);
    const originalCartKey = this.#cartKey(this.#cardTarget ?? p.target);
    this.#writes.add(p.target);
    this.#set({ pending: p, busy: true, message: '正在處理明確操作…' });
    try {
      const data = dataOf(await this.bridge.call(p.name, p.args));
      let cart: ShoppingCartView | undefined, o: OrderView | undefined;
      if (p.name === 'apps_create_order') {
        const d = z
          .object({ order: orderViewOutput, cart: shoppingCartViewOutput })
          .parse(data);
        cart = d.cart;
        o = d.order;
        if (cart.cartId !== p.target || o.cartId !== p.target) throw Error();
      } else if (p.name === 'apps_pay_order' || p.name === 'cancel_order') {
        o = orderViewOutput.parse(data);
        if (o.orderId !== p.target) throw Error();
      } else {
        cart = shoppingCartViewOutput.parse(data);
        if (p.name !== 'apps_get_or_create_cart' && cart.cartId !== p.target)
          throw Error();
      }
      if (o) o = this.#acceptOrder(o);
      if (
        o &&
        p.name === 'apps_create_order' &&
        originalCreatedKey &&
        !this.#persist(originalCreatedKey, o.orderId)
      )
        throw Error('Order location not persisted');
      if (cart && p.name === 'apps_get_or_create_cart') {
        if (originalCartKey && !this.#persist(originalCartKey, cart.cartId))
          throw Error('Cart location not persisted');
        if (g === this.#generation && !this.#persist(currentKey, cart.cartId))
          throw Error('Current cart not persisted');
      }
      const saved = this.#restore(p.target);
      if (
        saved?.name === p.name &&
        JSON.stringify(saved.args) === JSON.stringify(p.args)
      )
        this.storage!.removeItem(pendingKey(p.target));
      if (o && this.#target === o.orderId)
        this.#set({ order: o, pending: null });
      if (g !== this.#generation || !this.#alive) {
        if (o)
          this.#set({
            message: `原操作已完成，訂單 ${o.orderId} 可由原車訂單列表恢復。`,
          });
        return;
      }
      if (cart) {
        if (p.name === 'apps_get_or_create_cart') {
          this.#switch(cart.cartId);
        }
        const draft = { ...this.#state.draft };
        if (p.name === 'update_cart_item')
          delete draft[String(p.args.productId)];
        this.#set({ draft, dirty: Object.keys(draft).length > 0 });
        this.#acceptCart(cart, true);
      }
      this.#set({
        pending: null,
        needsRefresh: false,
        message: '',
      });
      if (o) {
        if (p.name === 'apps_create_order') {
          this.#switch(o.orderId);
          this.#orderTarget = o.orderId;
        }
        this.#set({ order: o, pending: null });
      } else await this.#quote();
    } catch (e) {
      if (g === this.#generation) {
        if (
          e instanceof ToolFailure &&
          !['UNKNOWN', 'TEMPORARY_UNAVAILABLE'].includes(e.code)
        ) {
          this.storage?.removeItem(pendingKey(p.target));
          this.#set({
            pending: null,
            needsRefresh: true,
            message: `服務端拒絕：${e.code}；請重新讀取並核對。`,
          });
        } else
          this.#set({
            pending: p,
            needsRefresh: true,
            message: '操作結果未知；只讀原目標或明確重試原操作，不能另建請求。',
          });
      }
    } finally {
      this.#writes.delete(p.target);
      if (g === this.#generation || this.#target === p.target)
        this.#set({ busy: false });
      await this.#drainForeground();
      if (this.#conflicts.has(p.target) && !this.#reconciled.has(p.target)) {
        this.#reconciled.add(p.target);
        await this.#readOrder(p.target);
      }
    }
  }
  async listOrders(offset = 0) {
    const cartId = this.#state.cart?.cartId;
    if (!cartId) return;
    const g = this.#generation;
    try {
      const list = listSchema.parse(
        dataOf(
          await this.bridge.call('list_orders', {
            cartId,
            offset,
            limit: 20,
            pendingOnly: false,
          }),
        ),
      );
      if (list.items.some((o) => o.cartId !== cartId)) throw Error();
      if (g === this.#generation)
        this.#set({
          orders: offset ? [...this.#state.orders, ...list.items] : list.items,
          nextOffset: list.nextOffset,
        });
    } catch {
      if (g === this.#generation)
        this.#set({ message: '訂單列表讀取未知，可重試。' });
    }
  }
  async continueShopping(confirm = false) {
    const cartId = this.#state.order?.cartId ?? this.#state.confirmCartId;
    if (!cartId) return;
    let current = this.#get(currentKey);
    try {
      if (current) current = JSON.parse(current) as string;
    } catch {
      /* Accept a plain ID saved by a prior session. */
    }
    if (current && current !== cartId && !confirm) {
      this.#set({
        confirmCartId: cartId,
        message: '目前有另一輛購物車。確認接續此訂單原車？不會合併。',
      });
      return;
    }
    if (!this.#persist(currentKey, cartId)) return;
    const key = this.#createdKey(this.#cardTarget ?? cartId);
    try {
      if (key) this.storage?.removeItem(key);
    } catch {
      this.#set({ message: '無法保存返回位置，請重試。' });
      return;
    }
    this.#switch(cartId);
    await this.reload();
  }
  dismissContinue() {
    this.#set({ confirmCartId: null, message: '保留目前購物車。' });
  }
  async share() {
    const o = this.#state.order;
    if (!o) return;
    if (!this.bridge.canOpen()) {
      this.#set({ message: 'Host 未提供外鏈能力，原訂單仍可在卡片內查看。' });
      return;
    }
    try {
      const url = validateOrderLink(
        o.navigation.shareUrl,
        this.origin,
        o.orderId,
        true,
      );
      const result = await this.bridge.open(url);
      this.#set({
        message: result.isError
          ? 'Host 拒絕開啟，原訂單與入口保留。'
          : '已請求開啟單訂單分享頁；這是展示限制，不是存取控制。',
      });
    } catch {
      this.#set({ message: '分享入口不合法或 Host 開啟失敗，保留原訂單。' });
    }
  }
  async #drainForeground() {
    if (this.#foregroundTarget !== this.#target || this.#state.busy) return;
    this.#foregroundTarget = null;
    await this.foreground();
  }
  async foreground() {
    if (this.#state.busy) {
      this.#foregroundTarget = this.#target;
      return;
    }
    if (this.#state.dirty) {
      this.#set({
        needsRefresh: true,
        message: '返回視圖，請先核對未儲存調整。',
      });
      return;
    }
    await this.reload();
  }
  dispose() {
    this.#alive = false;
    this.#generation++;
    this.#listeners.clear();
  }
}
