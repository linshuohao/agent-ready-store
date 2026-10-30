'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CartOperation,
  ShoppingCartView,
  OrderSummary,
} from '@store/contracts';
import { useCartOperations } from './provider';
import {
  readCart,
  quoteCart,
  acceptCart,
  cartFailure,
  pendingOrderKey,
  lastCreatedOrderKey,
} from './lifecycle-commands';
export function useCartPage(id?: string) {
  const operations = useCartOperations();
  const { install: installShared, selectCart, setDraftGuard } = operations;
  const [view, setView] = useState<ShoppingCartView | null>(null),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [selected, setSelected] = useState<string[]>([]),
    [quoteResult, setQuote] = useState<{
      key: string;
      data: OrderSummary;
    } | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(Boolean(id)),
    [reload, setReload] = useState(false),
    [working, setWorking] = useState(false),
    [unknownOrder, setUnknownOrder] = useState(false),
    [createdId, setCreatedId] = useState<string | null>(null);
  const viewRef = useRef<ShoppingCartView | null>(null),
    draftRef = useRef<Record<string, string>>({}),
    dirtyRef = useRef(false),
    workingRef = useRef(false),
    deferredRead = useRef(false),
    reloadRef = useRef(false),
    sequence = useRef(0),
    epoch = useRef(0),
    alive = useRef(true);
  const dirty = Boolean(
    view?.items.some((i) => draft[i.productId] !== String(i.quantity)),
  );
  const accept = useCallback(
    (cart: ShoppingCartView) => {
      if (!id || cart.cartId !== id) return;
      const next = acceptCart(viewRef.current, cart, id);
      if (!next || next !== cart) return;
      const previous = viewRef.current;
      // A skipped version may hide removal and re-add of the same SKU. With no line-generation ID,
      // require a fresh explicit selection rather than treating that new row as the old intent.
      if (previous && cart.cartVersion > previous.cartVersion + 1)
        setSelected([]);
      else if (previous?.cartVersion !== cart.cartVersion)
        setSelected((selected) =>
          selected.filter((id) => {
            const before = previous?.items.find(
              (item) => item.productId === id,
            );
            const after = cart.items.find((item) => item.productId === id);
            return before && after && before.quantity === after.quantity;
          }),
        );
      viewRef.current = cart;
      draftRef.current = Object.fromEntries(
        cart.items.map((i) => [i.productId, String(i.quantity)]),
      );
      dirtyRef.current = false;
      setView(cart);
      setDraft(draftRef.current);
      reloadRef.current = false;
      setReload(false);
      setDraftGuard(id, false);
      installShared(cart);
    },
    [id, setDraftGuard, installShared],
  );
  const load = useCallback(
    async (explicit = false) => {
      if (!id) return;
      if (workingRef.current) {
        deferredRead.current = true;
        return;
      }
      if (!explicit && reloadRef.current) return;
      if (!explicit && dirtyRef.current) {
        reloadRef.current = true;
        setReload(true);
        setError('購物車可能已更新，草稿已保留；請明確重新載入後核對。');
        setDraftGuard(id, true, true);
        return;
      }
      const read = ++sequence.current,
        edit = epoch.current;
      const result = await readCart(id);
      if (!alive.current || read !== sequence.current) return;
      setLoading(false);
      if (edit !== epoch.current || (dirtyRef.current && !explicit)) {
        reloadRef.current = true;
        setReload(true);
        setDraftGuard(id, true, true);
        return;
      }
      if (result.kind === 'success') {
        if (explicit) setSelected([]);
        accept(result.data);
        setError('');
      } else
        setError(
          result.kind === 'failure'
            ? cartFailure(result.error.code)
            : '暫時無法讀取購物車，請重試。',
        );
    },
    [id, accept, setDraftGuard],
  );
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (!live || !id) return;
      try {
        setUnknownOrder(localStorage.getItem(pendingOrderKey(id)) !== null);
        setCreatedId(localStorage.getItem(lastCreatedOrderKey(id)));
      } catch {
        setError(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
      }
    });
    return () => {
      live = false;
    };
  }, [id, operations.orderRevision]);
  useEffect(() => {
    alive.current = true;
    let active = true;
    queueMicrotask(() => {
      if (!active || !id) return;
      selectCart(id);
      void load(true);
      try {
        setUnknownOrder(localStorage.getItem(pendingOrderKey(id)) !== null);
        setCreatedId(localStorage.getItem(lastCreatedOrderKey(id)));
      } catch {
        setError(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
      }
    });
    const returned = () => {
      if (document.visibilityState !== 'hidden') void load();
    };
    window.addEventListener('focus', returned);
    window.addEventListener('pageshow', returned);
    document.addEventListener('visibilitychange', returned);
    return () => {
      active = false;
      alive.current = false;
      // Invalidate reads from the disposed page; this ref is a request counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++;
      if (id) setDraftGuard(id, false);
      window.removeEventListener('focus', returned);
      window.removeEventListener('pageshow', returned);
      document.removeEventListener('visibilitychange', returned);
    };
  }, [id, selectCart, load, setDraftGuard]);
  useEffect(() => {
    const incoming = operations.view;
    if (
      !incoming ||
      incoming.cartId !== id ||
      incoming === viewRef.current ||
      workingRef.current
    )
      return;
    if (viewRef.current && incoming.cartVersion < viewRef.current.cartVersion)
      return;
    queueMicrotask(() => {
      if (dirtyRef.current) {
        reloadRef.current = true;
        setReload(true);
        setError('購物車已更新，請保留草稿並重新核對。');
        if (id) setDraftGuard(id, true, true);
      } else accept(incoming);
    });
  }, [operations.view, id, accept, setDraftGuard]);
  const selection =
    view?.items
      .filter((i) => selected.includes(i.productId))
      .map((i) => ({ productId: i.productId, expectedQuantity: i.quantity })) ??
    [];
  const quoteKey = JSON.stringify([
    id,
    view?.cartVersion,
    selection,
    dirty,
    reload,
  ]);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => setQuote(null));
    if (id && selection.length && !dirty && !reload)
      void quoteCart(id, selection).then((result) => {
        if (live) {
          if (result.kind === 'success')
            setQuote({ key: quoteKey, data: result.data });
          else
            setError(
              result.kind === 'failure'
                ? cartFailure(result.error.code)
                : '無法取得目前所選預估，請重新選擇後再試。',
            );
        }
      });
    return () => {
      live = false;
    };
    // The key contains the complete selection, saved version and draft validity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);
  function change(productId: string, value: string) {
    epoch.current++;
    draftRef.current = { ...draftRef.current, [productId]: value };
    setDraft(draftRef.current);
    const changed = Boolean(
      viewRef.current?.items.some(
        (i) => draftRef.current[i.productId] !== String(i.quantity),
      ),
    );
    dirtyRef.current = changed;
    if (id) setDraftGuard(id, changed, reload);
  }
  async function perform(operation: CartOperation) {
    if (
      !id ||
      !viewRef.current ||
      workingRef.current ||
      operations.busy ||
      reload
    )
      return;
    if (
      operation.type === 'set_quantity' &&
      (!Number.isSafeInteger(operation.quantity) || operation.quantity <= 0)
    ) {
      setError('數量必須是正整數。');
      return;
    }
    workingRef.current = true;
    setWorking(true);
    epoch.current++;
    sequence.current++;
    try {
      const result = await operations.save({
        cartId: id,
        expectedCartVersion: viewRef.current.cartVersion,
        operation,
      });
      if (!alive.current) return;
      if (result.kind === 'success') {
        accept(result.data);
        setError('');
      } else {
        setError(
          result.kind === 'failure'
            ? cartFailure(result.error.code)
            : '保存結果未確認，請重試原購物車請求。',
        );
        if (
          result.kind === 'failure' &&
          ['CART_VERSION_CONFLICT', 'CART_ITEM_NOT_FOUND'].includes(
            result.error.code,
          )
        ) {
          reloadRef.current = true;
          setReload(true);
          setDraftGuard(id, dirtyRef.current, true);
        }
      }
    } finally {
      workingRef.current = false;
      if (alive.current) {
        setWorking(false);
        if (deferredRead.current) {
          deferredRead.current = false;
          void load();
        }
      }
    }
  }
  async function create(retry = false) {
    if (
      !id ||
      !viewRef.current ||
      workingRef.current ||
      operations.busy ||
      operations.pending ||
      !operations.isCurrentCart(id)
    )
      return;
    if (
      !retry &&
      (dirtyRef.current || reload || !selection.length || unknownOrder)
    )
      return;
    workingRef.current = true;
    setWorking(true);
    sequence.current++;
    try {
      const result = await operations.createOrder(
        id,
        retry
          ? undefined
          : {
              requestId: crypto.randomUUID(),
              expectedCartVersion: viewRef.current.cartVersion,
              selectedItems: selection,
              constraints: { currency: 'TWD' },
            },
      );
      if (!alive.current) return;
      if (result.kind === 'success') {
        if (dirtyRef.current || reloadRef.current) {
          reloadRef.current = true;
          setReload(true);
          setDraftGuard(id, dirtyRef.current, true);
          setError('原訂單已找回，數量草稿已保留；請重新載入核對剩餘商品。');
        } else {
          accept(result.data.cart);
          setError('');
        }
        setSelected([]);
        setCreatedId(result.data.order.orderId);
      } else
        setError(
          result.kind === 'failure'
            ? cartFailure(result.error.code)
            : '建立訂單結果未確認，請恢復原請求，勿重新建立。',
        );
      if (
        result.kind === 'failure' &&
        [
          'CART_VERSION_CONFLICT',
          'SELECTION_CHANGED',
          'CART_ITEM_NOT_FOUND',
        ].includes(result.error.code)
      ) {
        reloadRef.current = true;
        setReload(true);
        setDraftGuard(id, dirtyRef.current, true);
      }
      setUnknownOrder(localStorage.getItem(pendingOrderKey(id)) !== null);
    } finally {
      workingRef.current = false;
      if (alive.current) {
        setWorking(false);
        if (deferredRead.current) {
          deferredRead.current = false;
          void load();
        }
      }
    }
  }
  return {
    operations,
    view,
    draft,
    dirty,
    selected,
    setSelected,
    quote: quoteResult?.key === quoteKey ? quoteResult.data : null,
    error,
    loading,
    reload,
    working,
    unknownOrder,
    createdId,
    change,
    perform,
    create,
    load,
  };
}
