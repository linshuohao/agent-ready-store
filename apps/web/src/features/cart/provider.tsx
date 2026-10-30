'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  cartIdInput,
  type ShoppingCartView,
  type CartOperation,
} from '@store/contracts';
import { Button } from '@/components/ui/button';
import { CartFeedback } from './feedback';
import {
  CartCommands,
  createCartOrder,
  currentCartKey,
  readCart,
  acceptCart,
  cartFailure,
  type Call,
} from './lifecycle-commands';
import type { EditResult, OperationIntent } from './commands';
type Context = {
  toolInitialize: (
    input: Parameters<CartCommands['initialize']>[0],
  ) => Promise<Call<ShoppingCartView>>;
  toolOperate: (
    id: string,
    input: Parameters<CartCommands['operate']>[1],
  ) => Promise<Call<ShoppingCartView>>;
  orderRevision: number;
  createOrder: (
    id: string,
    input?: Parameters<typeof createCartOrder>[2],
    entrance?: 'webmcp',
  ) => ReturnType<typeof createCartOrder>;
  currentCartId: string | null;
  view: ShoppingCartView | null;
  ready: boolean;
  busy: boolean;
  pending: boolean;
  selectCart: (id: string) => boolean;
  resumeCart: (id: string, expectedCurrent: string | null) => boolean;
  isCurrentCart: (id: string) => boolean;
  install: (cart: ShoppingCartView) => void;
  setDraftGuard: (id: string, dirty: boolean, needsReload?: boolean) => void;
  add: (
    productId: string,
    entrance?: 'webmcp',
  ) => Promise<Call<ShoppingCartView>>;
  save: (intent: {
    cartId: string;
    expectedCartVersion: number;
    operation: CartOperation;
  }) => Promise<Call<ShoppingCartView>>;
  retry: () => Promise<Call<ShoppingCartView>>;
  // Retired callers remain blocked until the dedicated WebMCP/order migration tasks.
  restart: () => void;
  acquirePurchase: (
    id: string,
  ) => { code: string } | { current: () => boolean; release: () => void };
  toolSave: (intent: OperationIntent) => Promise<EditResult>;
  retryTool: (id?: string) => Promise<EditResult>;
};
const CartContext = createContext<Context | null>(null);
export const useCartOperations = () => {
  const context = useContext(CartContext);
  if (!context) throw Error('CartProvider required');
  return context;
};
const failure = (code: string) => ({
  kind: 'failure' as const,
  error: { code },
});
export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const orderPage = pathname.startsWith('/orders/');
  const current = useRef<string | null>(null),
    snapshot = useRef<ShoppingCartView | null>(null),
    commands = useRef<CartCommands | null>(null),
    active = useRef(false),
    draft = useRef<{ id: string; dirty: boolean; reload: boolean } | null>(
      null,
    );
  const [orderRevision, setOrderRevision] = useState(0);
  const [currentCartId, setId] = useState<string | null>(null),
    [view, setView] = useState<ShoppingCartView | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  const [messagePath, setMessagePath] = useState(pathname);
  if (messagePath !== pathname) {
    setMessagePath(pathname);
    setMessage('');
  }
  const refreshPending = useCallback(() => {
    try {
      setPending(
        Boolean(
          commands.current?.hasPending() ||
          (current.current && commands.current?.hasPending(current.current)),
        ),
      );
    } catch {
      setMessage(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
    }
  }, []);
  const selectCart = useCallback(
    (id: string) => {
      if (!cartIdInput.safeParse(id).success) return false;
      if (current.current && current.current !== id) return false;
      try {
        const stored = localStorage.getItem(currentCartKey);
        if (stored && stored !== id) return false;
        localStorage.setItem(currentCartKey, id);
      } catch {
        setMessage(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
        return false;
      }
      current.current = id;
      setId(id);
      refreshPending();
      return true;
    },
    [refreshPending],
  );
  const resumeCart = useCallback(
    (id: string, expectedCurrent: string | null) => {
      if (
        !cartIdInput.safeParse(id).success ||
        current.current !== expectedCurrent ||
        active.current ||
        (draft.current?.id === current.current && draft.current.dirty)
      )
        return false;
      try {
        if (localStorage.getItem(currentCartKey) !== expectedCurrent)
          return false;
        localStorage.setItem(currentCartKey, id);
      } catch {
        setMessage(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
        return false;
      }
      current.current = id;
      snapshot.current = null;
      draft.current = null;
      setId(id);
      setView(null);
      setMessage('');
      refreshPending();
      return true;
    },
    [refreshPending],
  );
  const install = useCallback((cart: ShoppingCartView) => {
    if (current.current !== cart.cartId) return;
    const next = acceptCart(snapshot.current, cart, cart.cartId);
    snapshot.current = next;
    setView(next);
  }, []);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      try {
        commands.current = new CartCommands(localStorage);
        const id = localStorage.getItem(currentCartKey);
        if (id) {
          if (!cartIdInput.safeParse(id).success) {
            setMessage(cartFailure('LOCAL_RECOVERY_INVALID'));
            return;
          }
          current.current = id;
          setId(id);
        }
        setReady(true);
        refreshPending();
      } catch {
        setMessage(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
      }
    });
    return () => {
      live = false;
    };
  }, [refreshPending]);
  const setDraftGuard = useCallback(
    (id: string, dirty: boolean, needsReload = false) => {
      draft.current = { id, dirty, reload: needsReload };
    },
    [],
  );
  async function run(work: () => Promise<Call<ShoppingCartView>>) {
    if (!commands.current || !ready || active.current)
      return failure('CART_BUSY');
    active.current = true;
    setBusy(true);
    try {
      const result = await work();
      if (result.kind === 'success') {
        if (!current.current) selectCart(result.data.cartId);
        install(result.data);
        setMessage('已儲存購物車');
      } else
        setMessage(
          result.kind === 'unknown'
            ? '保存結果未確認，請重試原請求。'
            : cartFailure(result.error.code),
        );
      return result;
    } finally {
      active.current = false;
      setBusy(false);
      refreshPending();
    }
  }
  async function add(productId: string, entrance?: 'webmcp') {
    if (entrance) return failure('CHECKOUT_FLOW_REPLACED');
    if (
      draft.current?.id === current.current &&
      (draft.current.dirty || draft.current.reload)
    )
      return failure('UNSAVED_DRAFT');
    return run(async () => {
      if (
        commands.current!.hasPending() ||
        (current.current && commands.current!.hasPending(current.current))
      )
        return failure('CART_RECOVERY_REQUIRED');
      const id = current.current;
      if (!id)
        return commands.current!.initialize({
          requestId: crypto.randomUUID(),
          initialItems: [{ productId, quantity: 1 }],
        });
      const latest = await readCart(id);
      if (latest.kind !== 'success') return latest;
      if (current.current !== id) return failure('STALE_CONTEXT');
      return commands.current!.operate(id, {
        operationRequestId: crypto.randomUUID(),
        expectedCartVersion: latest.data.cartVersion,
        operation: { type: 'add_item', productId, quantity: 1 },
      });
    });
  }
  async function save(intent: {
    cartId: string;
    expectedCartVersion: number;
    operation: CartOperation;
  }) {
    if (intent.cartId !== current.current) return failure('STALE_CONTEXT');
    if (draft.current?.id === intent.cartId && draft.current.reload)
      return failure('CART_VERSION_CONFLICT');
    return run(() =>
      commands.current!.operate(intent.cartId, {
        operationRequestId: crypto.randomUUID(),
        expectedCartVersion: intent.expectedCartVersion,
        operation: intent.operation,
      }),
    );
  }
  const toolInitialize = (input: Parameters<CartCommands['initialize']>[0]) => {
    if (current.current && !commands.current?.hasPending())
      return Promise.resolve(failure('STALE_CONTEXT'));
    return run(() => commands.current!.initialize(input, 'webmcp'));
  };
  const toolOperate = (
    id: string,
    input: Parameters<CartCommands['operate']>[1],
  ) => {
    if (current.current !== id)
      return Promise.resolve(failure('STALE_CONTEXT'));
    if (
      draft.current?.id === id &&
      (draft.current.dirty || draft.current.reload)
    )
      return Promise.resolve(failure('UNSAVED_DRAFT'));
    return run(() => commands.current!.operate(id, input));
  };
  async function createOrder(
    id: string,
    input?: Parameters<typeof createCartOrder>[2],
    entrance?: 'webmcp',
  ) {
    if (!ready || active.current) return failure('CART_BUSY');
    if (current.current !== id) return failure('STALE_CONTEXT');
    if (
      input &&
      draft.current?.id === id &&
      (draft.current.dirty || draft.current.reload)
    )
      return failure('UNSAVED_DRAFT');
    active.current = true;
    setBusy(true);
    try {
      return await createCartOrder(localStorage, id, input, entrance);
    } finally {
      active.current = false;
      setBusy(false);
      setOrderRevision((n) => n + 1);
    }
  }
  const retry = () =>
    run(() =>
      commands.current!.retry(
        commands.current!.hasPending()
          ? undefined
          : (current.current ?? undefined),
      ),
    );
  return (
    <CartContext.Provider
      value={{
        toolInitialize,
        toolOperate,
        orderRevision,
        createOrder,
        currentCartId,
        view,
        ready,
        busy,
        pending,
        selectCart,
        resumeCart,
        install,
        isCurrentCart: (id) => current.current === id,
        setDraftGuard,
        add,
        save,
        retry,
        restart: () => setMessage('購物車會持續保留，請繼續原車選購。'),
        acquirePurchase: () => ({ code: 'CHECKOUT_FLOW_REPLACED' }),
        toolSave: async () => failure('CHECKOUT_FLOW_REPLACED'),
        retryTool: async () => failure('CHECKOUT_FLOW_REPLACED'),
      }}
    >
      {!orderPage && message && (
        <CartFeedback
          success={message === '已儲存購物車'}
          onDismiss={() => setMessage('')}
        >
          <p role="status">{message}</p>
          {currentCartId && (
            <Link href={`/cart/${currentCartId}`} prefetch={false}>
              前往購物車
            </Link>
          )}
        </CartFeedback>
      )}
      {!orderPage && pending && (
        <section className="notice" aria-label="購物車恢復">
          <p>上次購物車操作結果未確認，請使用原請求恢復。</p>
          <Button disabled={busy} onClick={() => void retry()}>
            重試原購物車請求
          </Button>
        </section>
      )}
      {children}
    </CartContext.Provider>
  );
}
