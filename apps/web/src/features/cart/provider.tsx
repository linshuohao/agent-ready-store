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
  replaceCart,
  inspectEdit,
  failureText,
  type EditIntent,
  type EditResult,
} from './commands';

type Creation = {
  selectionVersion: number;
  createRequestId: string;
  cartToken: string;
  items: CartItem[];
};
const creationPendingKey = 'cartCreationPending';
type Context = {
  currentCartId: string | null;
  selectCart: (id: string) => void;
  restart: () => void;
  busy: boolean;
  pendingEdit: EditIntent | null;
  add: (productId: string) => Promise<void>;
  save: (intent: EditIntent) => Promise<EditResult | undefined>;
  retryEdit: () => Promise<EditResult | undefined>;
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
  const lock = useRef(true);
  const inFlight = useRef(false);
  // The ref blocks writes until storage is read; avoid an unnecessary mount update
  // around streamed children when this tab has no pending creation.
  const [busy, setBusy] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<EditIntent | null>(null);
  const [creationUnknown, setCreationUnknown] = useState(false);
  const [creationLost, setCreationLost] = useState(false);
  const pathname = usePathname();
  const [feedback, setFeedback] = useState<{
    text: string;
    path: string;
  } | null>(null);
  const message = feedback?.text ?? '';
  const setMessage = (text: string) =>
    setFeedback(text ? { text, path: pathname } : null);
  // Navigation ends this page's feedback; mutation recovery state stays in the provider.
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
      lock.current = lost;
      setBusy(lost);
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
  const unlock = () => {
    lock.current = false;
    setBusy(false);
  };
  async function performSave(
    intent: EditIntent,
    recovery: boolean,
  ): Promise<EditResult | undefined> {
    if (inFlight.current || (!recovery && lock.current)) return;
    lock.current = true;
    inFlight.current = true;
    setBusy(true);
    try {
      let result: EditResult = await replaceCart(intent);
      if (
        result.kind === 'unknown' ||
        (result.kind === 'failure' &&
          (result.error.code === 'CART_VERSION_CONFLICT' ||
            (recovery &&
              !['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(
                result.error.code,
              ))))
      ) {
        setPendingEdit(intent);
        result = await inspectEdit(intent);
      }
      if (result.kind === 'unknown') {
        setPendingEdit(intent);
      } else {
        setPendingEdit(null);
        unlock();
      }
      return result;
    } finally {
      inFlight.current = false;
    }
  }
  async function finishCreation() {
    if (!creation.current || inFlight.current) return;
    inFlight.current = true;
    lock.current = true;
    setBusy(true);
    const { selectionVersion: owner, ...input } = creation.current;
    const result = await createCart(input);
    inFlight.current = false;
    if (result.kind === 'unknown') {
      setCreationUnknown(true);
      setMessage('建立結果未明，請使用原請求重試。');
      return;
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
    unlock();
  }
  async function add(productId: string) {
    if (lock.current || inFlight.current) return;
    lock.current = true;
    setBusy(true);
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
      };
      // Persist only uncertainty, never the capability or request materials.
      sessionStorage.setItem(creationPendingKey, '1');
      await finishCreation();
      return;
    }
    select(id);
    const latest = await getCart(id);
    if (latest.kind !== 'success') {
      unlock();
      setMessage(
        latest.kind === 'failure'
          ? failureText(latest.error)
          : '暫時無法讀取購物車，請重試。',
      );
      setCanRestart(
        latest.kind === 'failure' &&
          ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(latest.error.code),
      );
      return;
    }
    if (latest.cart.orderId) {
      unlock();
      setMessage('此購物車已完成購買，請明確開始新的購物。');
      setCanRestart(true);
      return;
    }
    const items = latest.cart.items.map(({ productId, quantity }) => ({
      productId,
      quantity,
    }));
    const item = items.find((item) => item.productId === productId);
    if (item) item.quantity++;
    else items.push({ productId, quantity: 1 });
    // Transfer the synchronous page lock to the mutation without an event-loop gap.
    lock.current = false;
    const result = await performSave(
      { cartId: id, expectedCartVersion: latest.cart.cartVersion, items },
      false,
    );
    if (result?.kind === 'success') setMessage('已加入購物車');
    else if (result?.kind === 'conflict')
      setMessage('購物車已變更，請開啟購物車重新調整。');
    else if (result?.kind === 'failure') setMessage(failureText(result.error));
  }
  const restart = () => {
    if (inFlight.current) return;
    creation.current = null;
    sessionStorage.removeItem(creationPendingKey);
    setCreationLost(false);
    setCreationUnknown(false);
    setPendingEdit(null);
    unlock();
    select(null);
    setCanRestart(false);
    setMessage('請重新選擇商品建立購物車。');
  };
  return (
    <CartContext.Provider
      value={{
        currentCartId: cartId,
        selectCart: select,
        restart,
        busy,
        pendingEdit,
        add,
        save: (intent) => performSave(intent, false),
        retryEdit: () =>
          pendingEdit
            ? performSave(pendingEdit, true)
            : Promise.resolve(undefined),
      }}
    >
      <nav className="cart-nav" aria-label="購物導覽">
        <Link href={cartId ? `/cart/${cartId}` : '/cart'} prefetch={false}>
          購物車
        </Link>
      </nav>
      {((message && !pathname.startsWith('/cart')) ||
        creationUnknown ||
        creationLost ||
        pendingEdit) && (
        <CartFeedback
          success={
            message === '已加入購物車' && !creationUnknown && !pendingEdit
          }
          onDismiss={() => setFeedback(null)}
        >
          {message && <p role="status">{message}</p>}
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
          {pendingEdit && (
            <p>
              保存結果尚未確認，請
              <Link href={`/cart/${pendingEdit.cartId}`} prefetch={false}>
                開啟原購物車恢復
              </Link>
              。
            </p>
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
