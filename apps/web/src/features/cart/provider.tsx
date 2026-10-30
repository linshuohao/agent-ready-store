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
import { CartFeedback } from './feedback';
import { cartIdInput, type CartItem } from '@store/contracts';
import { Button } from '@/components/ui/button';
import {
  createCart,
  getCart,
  operateCart,
  failureText,
  type OperationIntent,
  type EditResult,
} from './commands';

type Creation = {
  selectionVersion: number;
  createRequestId: string;
  cartToken: string;
  items: CartItem[];
  entrance?: 'webmcp';
};
const creationPendingKey = 'cartCreationPending';
type PurchaseLease = { current: () => boolean; release: () => void };
type Context = {
  isCurrentCart: (id: string) => boolean;
  acquirePurchase: (id: string) => PurchaseLease | { code: string };
  currentCartId: string | null;
  selectCart: (id: string) => void;
  restart: () => void;
  busy: boolean;
  add: (
    productId: string,
    entrance?: 'webmcp',
  ) => Promise<EditResult | undefined>;
  toolSave: (intent: OperationIntent) => Promise<EditResult | undefined>;
  retryTool: (cartId?: string) => Promise<EditResult>;
  setDraftGuard: (id: string, dirty: boolean, needsReload?: boolean) => void;
  save: (intent: OperationIntent) => Promise<EditResult | undefined>;
};
const CartContext = createContext<Context | null>(null);
export const useCartOperations = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('CartProvider required');
  return context;
};
export function CartProvider({ children }: { children: React.ReactNode }) {
  const currentId = useRef<string | null>(null);
  const selectionVersion = useRef(0);
  const creation = useRef<Creation | null>(null);
  const initialized = useRef(false);
  const inFlight = useRef(false);
  const draftGuard = useRef<{
    id: string;
    dirty: boolean;
    needsReload: boolean;
  } | null>(null);
  const setDraftGuard = useCallback(
    (id: string, dirty: boolean, needsReload = false) => {
      draftGuard.current = { id, dirty, needsReload };
    },
    [],
  );
  // Storage holds only navigation and a non-sensitive pending-creation marker.
  const [busy, setBusy] = useState(false);
  const [creationUnknown, setCreationUnknown] = useState(false);
  const [creationLost, setCreationLost] = useState(false);
  const pathname = usePathname();
  const blockedPage = useRef<string | null>(null);
  const [reloadPath, setReloadPath] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    blockedPage.current = null;
    void Promise.resolve().then(() => {
      if (active) setReloadPath(null);
    });
    return () => {
      active = false;
    };
  }, [pathname]);
  const [feedback, setFeedback] = useState<{
    text: string;
    path: string;
  } | null>(null);
  const message = feedback?.text ?? '';
  const setMessage = (text: string) =>
    setFeedback(text ? { text, path: pathname } : null);
  // Navigation ends feedback; only creation materials survive page navigation.
  if (feedback && feedback.path !== pathname) setFeedback(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [canRestart, setCanRestart] = useState(false);
  const select = useCallback((id: string | null) => {
    selectionVersion.current++;
    currentId.current = id;
    setCartId(id);
    if (id) sessionStorage.setItem('currentCartId', id);
    else sessionStorage.removeItem('currentCartId');
  }, []);
  useEffect(() => {
    // Defer browser-only navigation state until after hydration, without persisting secrets.
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const lost = sessionStorage.getItem(creationPendingKey) === '1';
      initialized.current = true;
      setCreationLost(lost);
      const id = sessionStorage.getItem('currentCartId');
      if (id && cartIdInput.safeParse(id).success && !currentId.current) {
        currentId.current = id;
        setCartId(id);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  function acquirePurchase(id: string): PurchaseLease | { code: string } {
    if (
      !initialized.current ||
      inFlight.current ||
      creation.current ||
      creationLost
    )
      return { code: 'CART_BUSY' };
    if (currentId.current !== id) return { code: 'STALE_CONTEXT' };
    if (
      blockedPage.current === pathname ||
      (draftGuard.current?.id === id && draftGuard.current.needsReload)
    )
      return { code: 'CART_RELOAD_REQUIRED' };
    if (draftGuard.current?.id === id && draftGuard.current.dirty)
      return { code: 'UNSAVED_DRAFT' };
    const owner = selectionVersion.current;
    inFlight.current = true;
    setBusy(true);
    let released = false;
    return {
      current: () =>
        !released &&
        owner === selectionVersion.current &&
        currentId.current === id,
      release: () => {
        if (!released) {
          released = true;
          inFlight.current = false;
          setBusy(false);
        }
      },
    };
  }
  async function finishCreation(): Promise<EditResult> {
    if (inFlight.current)
      return { kind: 'failure', error: { code: 'CART_BUSY' } };
    if (!creation.current)
      return { kind: 'failure', error: { code: 'NO_PENDING_CREATION' } };
    inFlight.current = true;
    setBusy(true);
    const { selectionVersion: owner, entrance, ...input } = creation.current;
    const result = await createCart(input, entrance);
    inFlight.current = false;
    setBusy(false);
    if (result.kind === 'unknown') {
      setCreationUnknown(true);
      setMessage('建立結果未明，請使用原請求重試。');
      return result;
    }
    setCreationUnknown(false);
    creation.current = null;
    // A later URL selection owns navigation, including across creation retries.
    if (selectionVersion.current === owner) {
      if (result.kind === 'success') {
        select(result.cart.cartId);
        setMessage('已加入購物車');
      } else {
        setMessage(failureText(result.error));
        setCanRestart(
          ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(result.error.code),
        );
      }
    }
    sessionStorage.removeItem(creationPendingKey);
    return result;
  }
  async function add(
    productId: string,
    entrance?: 'webmcp',
  ): Promise<EditResult | undefined> {
    if (blockedPage.current === pathname)
      return { kind: 'failure', error: { code: 'CART_RELOAD_REQUIRED' } };
    if (entrance && draftGuard.current?.dirty)
      return { kind: 'failure', error: { code: 'UNSAVED_DRAFT' } };
    if (
      !initialized.current ||
      inFlight.current ||
      creation.current ||
      creationLost
    )
      return { kind: 'failure', error: { code: 'CART_BUSY' } };
    setMessage('');
    setCanRestart(false);
    const stored = sessionStorage.getItem('currentCartId');
    const id =
      currentId.current ??
      (stored && cartIdInput.safeParse(stored).success ? stored : null);
    if (!id) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      creation.current = {
        selectionVersion: selectionVersion.current,
        createRequestId: crypto.randomUUID(),
        cartToken: token,
        items: [{ productId, quantity: 1 }],
        entrance,
      };
      // Persist only uncertainty, never the capability or request materials.
      sessionStorage.setItem(creationPendingKey, '1');
      return finishCreation();
    }
    select(id);
    const owner = selectionVersion.current;
    inFlight.current = true;
    setBusy(true);
    try {
      const latest = await getCart(id);
      if (selectionVersion.current !== owner) {
        return { kind: 'failure', error: { code: 'STALE_CONTEXT' } };
      }
      if (latest.kind !== 'success') {
        setMessage(
          latest.kind === 'failure'
            ? failureText(latest.error)
            : '暫時無法讀取購物車，請重試。',
        );
        setCanRestart(
          latest.kind === 'failure' &&
            ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(latest.error.code),
        );
        return latest;
      }
      if (latest.cart.orderId) {
        setMessage('此購物車已完成購買，請明確開始新的購物。');
        setCanRestart(true);
        return { kind: 'failure', error: { code: 'CART_COMPLETED' } };
      }
      const result = await operateCart({
        cartId: id,
        expectedCartVersion: latest.cart.cartVersion,
        operation: { type: 'add_item', productId, quantity: 1 },
        entrance,
      });
      if (selectionVersion.current !== owner)
        return { kind: 'failure', error: { code: 'STALE_CONTEXT' } };
      if (
        result.kind === 'unknown' ||
        (result.kind === 'failure' &&
          [
            'CART_VERSION_CONFLICT',
            'CART_ITEM_NOT_FOUND',
            'CART_COMPLETED',
          ].includes(result.error.code))
      ) {
        blockedPage.current = pathname;
        setReloadPath(pathname);
      }
      if (result?.kind === 'success') setMessage('已加入購物車');
      else if (result?.kind === 'failure')
        setMessage(failureText(result.error));
      else setMessage('保存結果未確認，請開啟購物車重新載入查看。');
      return result;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function save(
    intent: OperationIntent,
    tool = false,
  ): Promise<EditResult> {
    if (inFlight.current || creation.current || creationLost)
      return { kind: 'failure', error: { code: 'CART_BUSY' } };
    if (currentId.current !== intent.cartId)
      return { kind: 'failure', error: { code: 'STALE_CONTEXT' } };
    if (draftGuard.current?.id === intent.cartId) {
      if (draftGuard.current.needsReload)
        return { kind: 'failure', error: { code: 'CART_RELOAD_REQUIRED' } };
      if (tool && draftGuard.current.dirty)
        return { kind: 'failure', error: { code: 'UNSAVED_DRAFT' } };
    }
    const owner = selectionVersion.current;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await operateCart({
        ...intent,
        ...(tool ? { entrance: 'webmcp' as const } : {}),
      });
      return selectionVersion.current === owner
        ? result
        : { kind: 'failure', error: { code: 'STALE_CONTEXT' } };
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const restart = () => {
    if (inFlight.current) return;
    creation.current = null;
    sessionStorage.removeItem(creationPendingKey);
    setCreationLost(false);
    setCreationUnknown(false);
    select(null);
    setCanRestart(false);
    setMessage('請重新選擇商品建立購物車。');
  };
  return (
    <CartContext.Provider
      value={{
        currentCartId: cartId,
        acquirePurchase,
        isCurrentCart: (id) => currentId.current === id,
        selectCart: select,
        restart,
        busy:
          busy || creationUnknown || creationLost || reloadPath === pathname,
        add,
        setDraftGuard,
        retryTool: (cartId) => {
          if (creation.current?.entrance === 'webmcp') {
            if (
              cartId ||
              creation.current.selectionVersion !== selectionVersion.current
            )
              return Promise.resolve({
                kind: 'failure',
                error: { code: 'STALE_CONTEXT' },
              });
            return finishCreation();
          }
          return Promise.resolve({
            kind: 'failure',
            error: { code: 'NO_PENDING_CREATION' },
          });
        },
        toolSave: (intent) => save(intent, true),
        save,
      }}
    >
      {!pathname.startsWith('/order-details/') &&
        (message ||
          creationUnknown ||
          creationLost ||
          reloadPath === pathname) && (
          <CartFeedback
            success={message === '已加入購物車' && !creationUnknown}
            onDismiss={() => setFeedback(null)}
          >
            {message && <p role="status">{message}</p>}
            {reloadPath === pathname && cartId && (
              <Link href={`/cart/${cartId}`} prefetch={false}>
                重新載入購物車
              </Link>
            )}
            {creationLost && (
              <p role="status">
                建立結果無法確認，原請求材料已遺失，無法自動找回購物車。
                重新發起會建立新的購物車，原車可能仍存在。
              </p>
            )}
            {cartId && (
              <Link href={`/cart/${cartId}`} prefetch={false}>
                前往購物車
              </Link>
            )}
            {creationUnknown && (
              <Button
                type="button"
                onClick={() => {
                  void finishCreation();
                }}
              >
                重試原建立
              </Button>
            )}
            {(canRestart || creationLost) && (
              <Button type="button" onClick={restart}>
                重新發起購物
              </Button>
            )}
          </CartFeedback>
        )}
      {children}
    </CartContext.Provider>
  );
}
