'use client';
import { useRuntime } from '../../runtime';
import { CartNotices } from './cart-notices';
import type { PurchaseSelection } from './purchase-selection';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { usePathname } from '../../runtime';
import {
  cartIdInput,
  type ShoppingCartView,
  type CartOperation,
} from '@store/contracts';
import {
  CartCommands,
  createCartOrder,
  currentCartKey,
  addIdentity,
  initializationKey,
  requestKey,
  type RecoveryRequest,
  acceptCart,
  cartFailure,
  type Call,
} from './lifecycle-commands';
type Context = {
  canAcceptDelivery: () => boolean;
  toolAdd: (
    input: Parameters<CartCommands['add']>[0],
  ) => Promise<Call<ShoppingCartView>>;
  removalRevision: { productId: string; revision: number } | null;
  toolOperate: (
    id: string,
    input: Parameters<CartCommands['operate']>[1],
  ) => Promise<Call<ShoppingCartView>>;
  orderRevision: number;
  createOrder: (
    id: string,
    input?: Parameters<typeof createCartOrder>[2],
    entrance?: 'webmcp',
    selectionOwnership?: PurchaseSelection,
    requestId?: string,
    draftOwnership?: Record<string, string>,
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
  retry: (requestId: string) => Promise<Call<ShoppingCartView>>;
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
  const { storage, transport } = useRuntime();
  const pathname = usePathname();
  const orderPage = pathname.startsWith('/orders/');
  const current = useRef<string | null>(null),
    snapshot = useRef<ShoppingCartView | null>(null),
    commands = useRef<CartCommands | null>(null),
    active = useRef(0),
    draft = useRef<{ id: string; dirty: boolean; reload: boolean } | null>(
      null,
    );
  const [orderRevision, setOrderRevision] = useState(0);
  const [removalRevision, setRemovalRevision] = useState<{
    productId: string;
    revision: number;
  } | null>(null);
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
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
      const list = commands.current?.list() ?? [];
      setRequests(list);
      setPending(list.length > 0);
    } catch {
      setMessage(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
    }
  }, []);
  const selectCart = useCallback(
    (id: string) => {
      if (!cartIdInput.safeParse(id).success) return false;
      if (current.current && current.current !== id) return false;
      try {
        const stored = storage.getItem(currentCartKey);
        if (stored && stored !== id) return false;
        storage.setItem(currentCartKey, id);
      } catch {
        setMessage(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
        return false;
      }
      current.current = id;
      setId(id);
      refreshPending();
      return true;
    },
    [refreshPending, storage],
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
        if (storage.getItem(currentCartKey) !== expectedCurrent) return false;
        storage.setItem(currentCartKey, id);
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
    [refreshPending, storage],
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
        commands.current = new CartCommands(storage, transport);
        const id = storage.getItem(currentCartKey);
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
  }, [refreshPending, storage, transport]);
  const setDraftGuard = useCallback(
    (id: string, dirty: boolean, needsReload = false) => {
      draft.current = { id, dirty, reload: needsReload };
    },
    [],
  );
  async function run(work: () => Promise<Call<ShoppingCartView>>) {
    if (!commands.current || !ready) return failure('CART_BUSY');
    active.current++;
    setBusy(true);
    try {
      const result = await work();
      if (result.kind === 'success') {
        if (
          !current.current &&
          storage.getItem(currentCartKey) === result.data.cartId
        )
          selectCart(result.data.cartId);
        install(result.data);
        setMessage(
          result.recoveryWarning
            ? '購物車已儲存，但本機恢復資料保存失敗；原請求仍保留供查詢。'
            : '已儲存購物車',
        );
      } else
        setMessage(
          result.kind === 'unknown'
            ? '保存結果未確認，請先查詢結果；繼續原操作需另外確認。'
            : cartFailure(result.error.code),
        );
      return result;
    } finally {
      active.current--;
      setBusy(active.current > 0);
      refreshPending();
    }
  }
  async function add(productId: string, entrance?: 'webmcp') {
    return run(async () => {
      try {
        const identity = await addIdentity(storage);
        return commands.current!.add(
          {
            ...identity,
            operationRequestId: crypto.randomUUID(),
            productId,
            quantity: 1,
          },
          entrance,
        );
      } catch (error) {
        return failure(
          error instanceof Error ? error.message : 'LOCAL_STORAGE_UNAVAILABLE',
        );
      }
    });
  }
  async function save(intent: {
    cartId: string;
    expectedCartVersion: number;
    operation: CartOperation;
  }) {
    if (intent.cartId !== current.current) return failure('STALE_CONTEXT');
    return run(() =>
      commands.current!.operate(intent.cartId, {
        operationRequestId: crypto.randomUUID(),
        ...(intent.operation.type === 'add_item'
          ? {}
          : { expectedCartVersion: intent.expectedCartVersion }),
        operation: intent.operation,
      } as Parameters<CartCommands['operate']>[1]),
    );
  }
  const toolAdd = (input: Parameters<CartCommands['add']>[0]) =>
    run(async () => {
      try {
        const saved = storage.getItem(requestKey(input.operationRequestId));
        if (saved) {
          const original = JSON.parse(saved) as RecoveryRequest;
          if (
            JSON.stringify(original.body) !== JSON.stringify(input) ||
            original.path !== '/webmcp/carts/add'
          )
            return failure('LOCAL_RECOVERY_INVALID');
          return commands.current!.add(input, 'webmcp');
        }
        await addIdentity(
          storage,
          'cartId' in input
            ? { cartId: input.cartId }
            : { initializationId: input.initializationId },
        );
        return commands.current!.add(input, 'webmcp');
      } catch (error) {
        const code =
          error instanceof Error ? error.message : 'LOCAL_STORAGE_UNAVAILABLE';
        if (code === 'STALE_CONTEXT') {
          const cartId = storage.getItem(currentCartKey),
            initializationId = storage.getItem(initializationKey);
          return {
            kind: 'failure' as const,
            error: {
              code,
              details: cartId
                ? { cartId }
                : initializationId
                  ? { initializationId }
                  : {},
            },
          };
        }
        return failure(code);
      }
    });
  const toolOperate = (
    id: string,
    input: Parameters<CartCommands['operate']>[1],
  ) => {
    if (current.current !== id)
      return Promise.resolve(failure('STALE_CONTEXT'));
    if (input.operation.type === 'remove_item')
      setRemovalRevision((previous) => ({
        productId: input.operation.productId,
        revision: (previous?.revision ?? 0) + 1,
      }));
    return run(() => commands.current!.operate(id, input));
  };
  async function createOrder(
    id: string,
    input?: Parameters<typeof createCartOrder>[2],
    entrance?: 'webmcp',
    selectionOwnership?: PurchaseSelection,
    requestId?: string,
    draftOwnership?: Record<string, string>,
  ) {
    if (!ready) return failure('CART_BUSY');
    if (current.current !== id) return failure('STALE_CONTEXT');
    try {
      return await createCartOrder(
        storage,
        id,
        input,
        entrance,
        transport,
        requestId,
        selectionOwnership,
        draftOwnership,
      );
    } finally {
      setOrderRevision((n) => n + 1);
    }
  }
  const retry = (requestId: string) =>
    run(() => commands.current!.retry(requestId));
  const query = async (requestId: string) => {
    const result = await commands.current!.query(requestId);
    if (
      result.kind === 'success' &&
      result.data.status === 'found' &&
      'cart' in result.data
    ) {
      if (
        !current.current &&
        storage.getItem(currentCartKey) === result.data.cart.cartId
      )
        selectCart(result.data.cart.cartId);
      install(result.data.cart);
      setMessage('已確認原購物車操作結果。');
    } else
      setMessage(
        result.kind === 'success'
          ? '目前尚未找到結果，原請求仍可能稍後完成。'
          : '暫時無法查詢，原請求仍保留。',
      );
    refreshPending();
  };
  return (
    <CartContext.Provider
      value={{
        canAcceptDelivery: () =>
          !active.current && !draft.current?.dirty && !draft.current?.reload,
        toolAdd,
        removalRevision,
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
        isCurrentCart: (id) => {
          try {
            return (
              current.current === id && storage.getItem(currentCartKey) === id
            );
          } catch {
            return false;
          }
        },
        setDraftGuard,
        add,
        save,
        retry,
      }}
    >
      <CartNotices
        orderPage={orderPage}
        message={message}
        currentCartId={currentCartId}
        requests={requests}
        dismiss={() => setMessage('')}
        retry={(requestId) => void retry(requestId)}
        query={(requestId) => void query(requestId)}
      />
      {children}
    </CartContext.Provider>
  );
}
