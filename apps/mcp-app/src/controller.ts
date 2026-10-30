import { z } from 'zod';
import {
  cartViewOutput,
  orderOutput,
  cartCapabilityInput,
  agentCreateInput,
  agentUpdateInput,
  cartItemsInput,
  handoffOutput,
  searchInput,
  productInput,
  type CartView,
  type OrderResult,
  type ProductDetail,
  type ProductSummary,
} from '@store/contracts';
export type EntryTool =
  | 'search_products'
  | 'get_product'
  | 'create_cart'
  | 'get_cart'
  | 'update_cart'
  | 'create_handoff';
export interface Bridge {
  call(
    name: 'get_cart' | 'update_cart' | 'create_handoff',
    args: Record<string, unknown>,
  ): Promise<unknown>;
  open(url: string): Promise<{ isError?: boolean }>;
  canOpen(): boolean;
}
export interface ViewState {
  cart: CartView | null;
  order: OrderResult | null;
  products: (ProductSummary | ProductDetail)[];
  draft: { productId: string; quantity: string }[] | null;
  dirty: boolean;
  busy: boolean;
  editable: boolean;
  needsRefresh: boolean;
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
const readOutput = z
  .object({ cart: cartViewOutput, order: orderOutput.nullable() })
  .strict();
const createOutput = z
  .object({
    cart: cartViewOutput,
    cartAccessToken: cartCapabilityInput.shape.cartAccessToken,
  })
  .strict();
const envelope = z
  .object({
    structuredContent: z
      .object({
        ok: z.boolean(),
        data: z.unknown().optional(),
        error: z.object({ code: z.string() }).passthrough().optional(),
      })
      .passthrough(),
    isError: z.boolean().optional(),
  })
  .passthrough();
class ToolFailure extends Error {
  constructor(readonly code: string) {
    super('Store operation unavailable');
  }
}
function dataOf(raw: unknown): unknown {
  const r = envelope.parse(raw);
  if (!r.structuredContent.ok || r.isError)
    throw new ToolFailure(r.structuredContent.error?.code ?? 'UNKNOWN');
  return r.structuredContent.data;
}
export function validateHandoff(
  url: string,
  origin: string,
  cartId: string,
  token: string,
) {
  const u = new URL(url);
  if (
    u.origin !== origin ||
    u.pathname !== `/checkout/${cartId}` ||
    u.search ||
    u.username ||
    u.password ||
    u.hash !== `#handoff=${token}`
  )
    throw new ToolFailure('UNSAFE_LINK');
  return u.href;
}
const fresh = (): ViewState => ({
  cart: null,
  order: null,
  products: [],
  draft: null,
  dirty: false,
  busy: false,
  editable: false,
  needsRefresh: false,
  message: '等待 Agent 提供商品或購物車。',
});
export class StoreController {
  #state = fresh();
  #cap: z.infer<typeof cartCapabilityInput> | null = null;
  #listeners = new Set<() => void>();
  #alive = true;
  #generation = 0;
  constructor(
    readonly entry: EntryTool,
    private bridge: Bridge,
    private origin: string,
  ) {}
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => {
    this.#listeners.add(fn);
    return () => {
      this.#listeners.delete(fn);
    };
  };
  #set(patch: Partial<ViewState>) {
    this.#state = { ...this.#state, ...patch };
    for (const fn of this.#listeners) fn();
  }
  #active(g: number, id: string) {
    return this.#alive && this.#generation === g && this.#cap?.cartId === id;
  }
  #usable() {
    const c = this.#state.cart;
    return !!c && !c.orderId && Date.parse(c.expiresAt) > Date.now();
  }
  #accept(cart: CartView, order: OrderResult | null = null) {
    if (cart.cartId !== this.#cap?.cartId && this.#cap)
      throw new ToolFailure('WRONG_CART');
    if (
      this.#state.cart?.cartId === cart.cartId &&
      cart.cartVersion < this.#state.cart.cartVersion
    )
      throw new ToolFailure('STALE_RESULT');
    if (
      order &&
      (order.cartId !== cart.cartId ||
        order.orderId !== cart.orderId ||
        order.snapshot.cartId !== cart.cartId)
    )
      throw new ToolFailure('WRONG_CART');
    this.#set({
      cart,
      order,
      editable:
        !!this.#cap && !cart.orderId && Date.parse(cart.expiresAt) > Date.now(),
    });
  }
  prepareInput(input: unknown) {
    const id =
      typeof input === 'object' && input !== null && 'cartId' in input
        ? input.cartId
        : undefined;
    if (
      this.#state.cart &&
      (this.entry === 'create_cart' ||
        (typeof id === 'string' && id !== this.#state.cart.cartId))
    ) {
      this.#generation++;
      this.#cap = null;
      this.#set({ ...fresh(), message: '等待 Agent 的新購物車結果。' });
    }
  }
  async receive(input: unknown, raw: unknown, toolInfoName?: string) {
    if (!this.#alive) return;
    try {
      if (toolInfoName && toolInfoName !== this.entry)
        throw new ToolFailure('WRONG_TOOL');
      const data = dataOf(raw);
      if (this.entry === 'search_products' || this.entry === 'get_product') {
        if (this.entry === 'search_products') {
          searchInput.parse(input ?? {});
          this.#set({
            products: page.parse(data).items,
            message: '商品與庫存為本次查詢快照；請由 Agent 準備購物車。',
          });
        } else {
          const p = productInput.parse(input);
          const d = detail.parse(data);
          if (p.productId !== d.id) throw new ToolFailure('WRONG_PRODUCT');
          this.#set({ products: [d], message: '請由 Agent 準備購物車。' });
        }
        return;
      }
      let cart: CartView,
        order: OrderResult | null = null,
        cap: z.infer<typeof cartCapabilityInput> | null = null;
      if (this.entry === 'create_cart') {
        if (input !== undefined) agentCreateInput.parse(input);
        const d = createOutput.parse(data);
        cart = d.cart;
        cap =
          input === undefined
            ? null
            : { cartId: cart.cartId, cartAccessToken: d.cartAccessToken };
      } else {
        const parsed =
          this.entry === 'update_cart'
            ? agentUpdateInput.safeParse(input)
            : cartCapabilityInput.safeParse(input);
        // A missing input has no authority; a malformed present input is rejected.
        if (input !== undefined && !parsed.success)
          throw new ToolFailure('INVALID_INPUT');
        cap = parsed.success
          ? {
              cartId: parsed.data.cartId,
              cartAccessToken: parsed.data.cartAccessToken,
            }
          : null;
        if (this.entry === 'get_cart') {
          const d = readOutput.parse(data);
          cart = d.cart;
          order = d.order;
        } else if (this.entry === 'update_cart')
          cart = cartViewOutput.parse(data);
        else cart = handoffOutput.parse(data).cart;
      }
      if (cap && cap.cartId !== cart.cartId)
        throw new ToolFailure('WRONG_CART');
      if (this.#state.cart?.cartId === cart.cartId) {
        if (cart.cartVersion < this.#state.cart.cartVersion) return;
        if (this.#state.dirty || this.#state.busy || this.#state.needsRefresh) {
          if (!this.#cap && cap) {
            this.#cap = cap;
            this.#set({
              editable:
                !cart.orderId && Date.parse(cart.expiresAt) > Date.now(),
            });
          }
          // Invalidate any request already in flight; only an explicit reload can unlock it.
          this.#generation++;
          this.#set({
            busy: false,
            needsRefresh: true,
            message: '其他入口已提供新結果；請重新載入並放棄未儲存調整。',
          });
          return;
        }
      }
      this.#generation++;
      this.#cap = cap;
      const previous = this.#state.cart;
      this.#set({
        ...fresh(),
        cart: previous?.cartId === cart.cartId ? previous : null,
      });
      this.#accept(cart, order);
      if (cap) await this.#read(false);
      else
        this.#set({
          message: '唯讀：請讓 Agent 重新呼叫 get_cart，提供完整同車存取能力。',
        });
    } catch {
      this.#generation++;
      this.#cap = null;
      this.#set({
        editable: false,
        busy: false,
        needsRefresh: true,
        message: '工具資料無效或與目前購物車不符；請讓 Agent 重新讀取。',
      });
    }
  }
  change(productId: string, quantity: string) {
    if (
      !this.#alive ||
      !this.#state.editable ||
      !this.#usable() ||
      this.#state.busy ||
      this.#state.needsRefresh
    )
      return;
    const draft =
      this.#state.draft ??
      this.#state.cart!.items.map((x) => ({
        productId: x.productId,
        quantity: String(x.quantity),
      }));
    if (!draft.some((x) => x.productId === productId)) return;
    this.#set({
      draft: draft.map((x) =>
        x.productId === productId ? { ...x, quantity } : x,
      ),
      dirty: true,
      message: '有未儲存調整；報價仍為上次已儲存內容。',
    });
  }
  remove(productId: string) {
    if (
      !this.#alive ||
      !this.#state.editable ||
      !this.#usable() ||
      this.#state.busy ||
      this.#state.needsRefresh
    )
      return;
    const draft =
      this.#state.draft ??
      this.#state.cart!.items.map((x) => ({
        productId: x.productId,
        quantity: String(x.quantity),
      }));
    this.#set({
      draft: draft.filter((x) => x.productId !== productId),
      dirty: true,
      message: '有未儲存調整；移除全部後仍需儲存。',
    });
  }
  async reload(discard = false) {
    if (!this.#alive || !this.#cap || this.#state.busy) return;
    if (this.#state.dirty && !discard) {
      this.#set({ message: '請明確選擇「放棄調整並重新載入」。' });
      return;
    }
    await this.#read(true);
  }
  async #read(explicit: boolean) {
    if (!this.#cap) return;
    const cap = this.#cap,
      g = ++this.#generation;
    this.#set({
      busy: true,
      draft: null,
      dirty: false,
      ...(explicit ? { needsRefresh: true } : {}),
      message: '正在重新讀取購物車…',
    });
    try {
      const d = readOutput.parse(
        dataOf(await this.bridge.call('get_cart', { ...cap })),
      );
      if (!this.#active(g, cap.cartId)) return;
      this.#accept(d.cart, d.order);
      this.#set({
        needsRefresh: false,
        message: d.cart.orderId
          ? '此車已完成購買；以下為原成交內容。'
          : Date.parse(d.cart.expiresAt) <= Date.now()
            ? '購物車已到期。'
            : '已取得服務端最新報價。',
      });
    } catch (e) {
      if (this.#active(g, cap.cartId))
        this.#fail(e, '讀取結果未明，請明確重新載入。');
    } finally {
      if (this.#active(g, cap.cartId)) this.#set({ busy: false });
    }
  }
  #fail(e: unknown, unknownMessage: string) {
    const code = e instanceof ToolFailure ? e.code : null;
    if (
      code &&
      [
        'FORBIDDEN',
        'CREDENTIAL_EXPIRED',
        'ACCESS_DENIED',
        'CART_NOT_FOUND',
      ].includes(code)
    ) {
      this.#cap = null;
      this.#set({
        editable: false,
        busy: false,
        needsRefresh: true,
        message: '存取能力失效或購物車已到期；請由 Agent 核對。',
      });
      return;
    }
    this.#set({
      needsRefresh: true,
      message:
        code === 'CART_COMPLETED'
          ? '購物車已完成；請重新載入原成交內容。'
          : code === 'CART_VERSION_CONFLICT'
            ? '版本衝突；請放棄調整並重新載入，不會自動重送。'
            : code === 'STALE_RESULT'
              ? '收到較舊版本；請重新載入。'
              : code
                ? '服務端未接受此操作；請核對問題商品後重新載入。'
                : unknownMessage,
    });
  }
  async save() {
    if (
      !this.#alive ||
      !this.#cap ||
      !this.#state.editable ||
      !this.#usable() ||
      this.#state.busy ||
      this.#state.needsRefresh ||
      !this.#state.dirty
    )
      return;
    const draft = this.#state.draft!;
    const parsed = cartItemsInput.safeParse(
      draft.map((x) => ({
        productId: x.productId,
        quantity: /^[1-9]\d*$/.test(x.quantity) ? Number(x.quantity) : NaN,
      })),
    );
    if (!parsed.success) {
      this.#set({ message: '數量須為 1 至 2147483647 的整數。' });
      return;
    }
    const cap = this.#cap,
      g = ++this.#generation,
      version = this.#state.cart!.cartVersion;
    this.#set({ busy: true, message: '正在儲存整車調整…' });
    try {
      const cart = cartViewOutput.parse(
        dataOf(
          await this.bridge.call('update_cart', {
            ...cap,
            expectedCartVersion: version,
            items: parsed.data,
          }),
        ),
      );
      if (!this.#active(g, cap.cartId)) return;
      this.#accept(cart);
      this.#set({
        draft: null,
        dirty: false,
        message: '已儲存；金額以服務端報價為準。',
      });
    } catch (e) {
      if (this.#active(g, cap.cartId))
        this.#fail(e, '儲存結果未明；請重新載入，不會自動重送。');
    } finally {
      if (this.#active(g, cap.cartId)) this.#set({ busy: false });
    }
  }
  #checkoutAllowed(g: number, id: string) {
    return (
      this.#active(g, id) &&
      !this.#state.dirty &&
      !this.#state.needsRefresh &&
      this.#usable() &&
      this.#state.cart?.canCheckout === true
    );
  }
  async checkout() {
    if (
      !this.#alive ||
      !this.#cap ||
      this.#state.busy ||
      this.#state.dirty ||
      this.#state.needsRefresh ||
      !this.#state.editable ||
      !this.#usable() ||
      !this.#state.cart?.canCheckout
    )
      return;
    if (!this.bridge.canOpen()) {
      this.#set({
        message: '此 Host 未宣告外鏈能力；請由 Agent 提供既有交接方式。',
      });
      return;
    }
    const cap = this.#cap,
      g = ++this.#generation;
    let stage: 'read' | 'handoff' | 'open' = 'read';
    this.#set({ busy: true, message: '正在校準結帳內容…' });
    try {
      const d = readOutput.parse(
        dataOf(await this.bridge.call('get_cart', { ...cap })),
      );
      if (!this.#active(g, cap.cartId)) return;
      this.#accept(d.cart, d.order);
      if (!this.#checkoutAllowed(g, cap.cartId)) {
        this.#set({ message: '目前購物車受阻、已完成或到期，無法前往結帳。' });
        return;
      }
      stage = 'handoff';
      const h = handoffOutput.parse(
        dataOf(await this.bridge.call('create_handoff', { ...cap })),
      );
      if (!this.#checkoutAllowed(g, cap.cartId)) return;
      this.#accept(h.cart);
      if (
        !this.#checkoutAllowed(g, cap.cartId) ||
        Date.parse(h.handoff.expiresAt) <= Date.now()
      ) {
        this.#set({ message: '交接內容已受阻、完成或到期，已停止開啟。' });
        return;
      }
      const url = validateHandoff(
        h.handoff.url,
        this.origin,
        cap.cartId,
        cap.cartAccessToken,
      );
      stage = 'open';
      const r = await this.bridge.open(url);
      if (!this.#checkoutAllowed(g, cap.cartId)) return;
      this.#set({
        message: r.isError
          ? 'Host 拒絕開啟外鏈；可明確再試，或請 Agent 提供交接方式。'
          : '已向 Host 請求開啟商城。若未開啟，請檢查 Host 外鏈限制；尚未完成購買。',
      });
    } catch (e) {
      if (!this.#active(g, cap.cartId)) return;
      if (e instanceof ToolFailure && e.code === 'UNSAFE_LINK')
        this.#set({
          needsRefresh: true,
          message: '交接網址不符合安全規則，已停止開啟。',
        });
      else if (stage === 'open')
        this.#set({
          message:
            '外鏈開啟結果未明；請先檢查是否已開啟，再明確重試。尚未購買。',
        });
      else if (stage === 'handoff' && !(e instanceof ToolFailure))
        this.#set({
          message: '交接結果未明；可明確重試同車交接，不會延長期限。',
        });
      else this.#fail(e, '結帳校準結果未明；請重新載入。');
    } finally {
      if (this.#active(g, cap.cartId)) this.#set({ busy: false });
    }
  }
  dispose() {
    this.#alive = false;
    this.#generation++;
    this.#cap = null;
    this.#state = { ...fresh(), message: '視圖已關閉。' };
    this.#listeners.clear();
  }
}
