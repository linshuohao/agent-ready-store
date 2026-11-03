'use client';
import { useRuntime, useRouter, usePathname } from '../../runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CartOperation,
  ShoppingCartView,
  SelectionQuote,
} from '@store/contracts';
import { useCartOperations } from './provider';
import {
  readCart,
  quoteCart,
  acceptCart,
  cartFailure,
  pendingRequests,
  lastCreatedOrderKey,
  queryRequest,
  type RecoveryRequest,
} from './lifecycle-commands';
import {
  consumeSelection,
  purchaseItems,
  type PurchaseSelection,
} from './purchase-selection';
export function useCartPage(id?: string) {
  const { storage, transport } = useRuntime();
  const operations = useCartOperations(),
    router = useRouter(),
    pathname = usePathname();
  const { setDraftGuard, install, selectCart } = operations;
  const [view, setView] = useState<ShoppingCartView | null>(null);
  const viewRef = useRef<ShoppingCartView | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const drafts = useRef<Record<string, string>>({}),
    edits = useRef<Record<string, string>>({}),
    draftBases = useRef<Record<string, number>>({}),
    saveAttempts = useRef<Record<string, string>>({});
  const [selection, setSelection] = useState<PurchaseSelection>({});
  const choices = useRef<PurchaseSelection>({});
  const [quote, setQuote] = useState<SelectionQuote | null>(null),
    quoteSequence = useRef(0);
  const quoteCartId = useRef(id);
  const [quoteError, setQuoteError] = useState(''),
    [quoteLoading, setQuoteLoading] = useState(false),
    [quoteRevision, setQuoteRevision] = useState(0);
  const [error, setError] = useState(''),
    [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false),
    [reload, setReload] = useState(false),
    [working, setWorking] = useState(false);
  const [rows, setRows] = useState<string[]>([]),
    rowActive = useRef(new Set<string>()),
    orderActive = useRef(false);
  const [orderRequests, setOrderRequests] = useState<RecoveryRequest[]>([]),
    [createdId, setCreatedId] = useState<string | null>(null);
  const alive = useRef(true),
    location = useRef(pathname),
    readSequence = useRef(0),
    navigationIntent = useRef(0);
  location.current = pathname;
  const dirty = !!view?.items.some(
    (item) => draft[item.productId] !== String(item.quantity),
  );
  useEffect(() => {
    if (id) setDraftGuard(id, dirty, reload);
    return () => {
      if (id) setDraftGuard(id, false);
    };
  }, [id, dirty, reload, setDraftGuard]);
  const updateSelection = useCallback((next: PurchaseSelection) => {
    choices.current = next;
    setSelection(next);
  }, []);
  const accept = useCallback(
    (
      incoming: ShoppingCartView,
      acknowledged?: { productId: string; generation: string },
    ) => {
      if (!id || incoming.cartId !== id || !alive.current) return;
      const previous = viewRef.current;
      const next = acceptCart(previous, incoming, id);
      if (next !== incoming) return;
      const values = { ...drafts.current };
      for (const item of incoming.items) {
        const old = previous?.items.find(
          (line) => line.productId === item.productId,
        );
        const unchanged =
          values[item.productId] === undefined ||
          values[item.productId] === String(old?.quantity);
        const ownSave =
          acknowledged?.productId === item.productId &&
          acknowledged.generation ===
            (edits.current[item.productId] ?? 'initial');
        if (unchanged || ownSave) {
          values[item.productId] = String(item.quantity);
          delete draftBases.current[item.productId];
        }
      }
      for (const old of previous?.items ?? []) {
        if (
          !incoming.items.some((item) => item.productId === old.productId) &&
          values[old.productId] === String(old.quantity)
        ) {
          delete values[old.productId];
          delete draftBases.current[old.productId];
        }
      }
      drafts.current = values;
      setDraft(values);
      viewRef.current = incoming;
      setView(incoming);
      install(incoming);
    },
    [id, install],
  );
  const refreshRecovery = useCallback(() => {
    if (!id) return;
    try {
      setOrderRequests(
        pendingRequests(storage).filter(
          (r) => r.kind === 'order' && r.cartId === id,
        ),
      );
      setCreatedId(
        (previous) => storage.getItem(lastCreatedOrderKey(id)) ?? previous,
      );
    } catch {
      setError(cartFailure('LOCAL_STORAGE_UNAVAILABLE'));
    }
  }, [id, storage]);
  const load = useCallback(
    async (explicit = false) => {
      if (!id) return;
      const sequence = ++readSequence.current;
      setLoading(!viewRef.current);
      const response = await readCart(id, transport);
      if (!alive.current || sequence !== readSequence.current) return;
      setLoading(false);
      if (response.kind === 'success') {
        if (explicit) {
          setReload(false);
          setRowErrors({});
        }
        accept(response.data);
      } else
        setError(
          response.kind === 'failure'
            ? cartFailure(response.error.code)
            : '讀取結果未確認，請再查詢。',
        );
    },
    [id, transport, accept],
  );
  useEffect(() => {
    const reads = readSequence;
    alive.current = true;
    if (id) selectCart(id);
    void load();
    refreshRecovery();
    const foreground = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const leaving = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href]'))
        navigationIntent.current++;
    };
    document.addEventListener('click', leaving, true);
    window.addEventListener('focus', foreground);
    window.addEventListener('pageshow', foreground);
    document.addEventListener('visibilitychange', foreground);
    return () => {
      alive.current = false;
      reads.current++;
      document.removeEventListener('click', leaving, true);
      window.removeEventListener('focus', foreground);
      window.removeEventListener('pageshow', foreground);
      document.removeEventListener('visibilitychange', foreground);
    };
  }, [id, load, refreshRecovery, selectCart]);
  useEffect(() => {
    refreshRecovery();
  }, [operations.orderRevision, refreshRecovery]);
  useEffect(() => {
    if (
      operations.view &&
      operations.view.cartId === id &&
      operations.view !== viewRef.current
    )
      accept(operations.view);
  }, [operations.view, id, accept]);
  useEffect(() => {
    const removed = operations.removalRevision;
    if (!removed || !choices.current[removed.productId]) return;
    const next = { ...choices.current };
    delete next[removed.productId];
    updateSelection(next);
  }, [operations.removalRevision, updateSelection]);
  useEffect(() => {
    const quotes = quoteSequence;
    const sequence = ++quotes.current;
    const items = purchaseItems(selection);
    // Keep the last confirmed estimate mounted while refreshing this cart.
    if (!id || !items || quoteCartId.current !== id) setQuote(null);
    quoteCartId.current = id;
    setQuoteLoading(Boolean(id && items));
    setQuoteError(
      Object.keys(selection).length && !items
        ? '請輸入所選商品的有效正整數購買量。'
        : '',
    );
    if (!id || !items) return;
    void quoteCart(id, items, transport).then((result) => {
      if (!alive.current || sequence !== quoteSequence.current) return;
      setQuoteLoading(false);
      if (result.kind === 'success') setQuote(result.data);
      else {
        setQuote(null);
        setQuoteError(
          result.kind === 'unknown'
            ? '預估結果暫未確認，請重新查詢。'
            : cartFailure(result.error.code),
        );
      }
    });
    return () => {
      quotes.current++;
    };
  }, [id, selection, view?.cartVersion, transport, quoteRevision]);
  const setSelected = (ids: string[]) => {
    const next: PurchaseSelection = {};
    for (const productId of ids)
      next[productId] = choices.current[productId] ?? {
        productId,
        quantity:
          drafts.current[productId] ??
          String(
            viewRef.current?.items.find((i) => i.productId === productId)
              ?.quantity ?? 1,
          ),
        selectionRevision: crypto.randomUUID(),
      };
    updateSelection(next);
  };
  const change = (productId: string, quantity: string) => {
    if (draftBases.current[productId] === undefined && viewRef.current)
      draftBases.current[productId] = viewRef.current.cartVersion;
    if (
      quantity ===
      String(
        viewRef.current?.items.find((item) => item.productId === productId)
          ?.quantity,
      )
    )
      delete draftBases.current[productId];
    edits.current[productId] = crypto.randomUUID();
    drafts.current = { ...drafts.current, [productId]: quantity };
    setDraft(drafts.current);
    if (choices.current[productId])
      updateSelection({
        ...choices.current,
        [productId]: {
          productId,
          quantity,
          selectionRevision: crypto.randomUUID(),
        },
      });
  };
  const perform = async (operation: CartOperation) => {
    if (!id || !viewRef.current) return;
    if (operation.type === 'remove_item') {
      const next = { ...choices.current };
      delete next[operation.productId];
      updateSelection(next);
    }
    if (
      rowActive.current.has(operation.productId) &&
      operation.type !== 'remove_item'
    )
      return;
    if (
      operation.type === 'set_quantity' &&
      (!Number.isSafeInteger(operation.quantity) || operation.quantity < 1)
    ) {
      setRowErrors((previous) => ({
        ...previous,
        [operation.productId]: '請輸入正整數數量。',
      }));
      return;
    }
    const generation = edits.current[operation.productId] ?? 'initial';
    if (
      operation.type === 'set_quantity' &&
      saveAttempts.current[operation.productId] === generation
    )
      return;
    if (operation.type === 'set_quantity')
      saveAttempts.current[operation.productId] = generation;
    rowActive.current.add(operation.productId);
    setRows([...rowActive.current]);
    try {
      const result = await operations.save({
        cartId: id,
        expectedCartVersion:
          operation.type === 'set_quantity'
            ? (draftBases.current[operation.productId] ??
              viewRef.current.cartVersion)
            : viewRef.current.cartVersion,
        operation,
      });
      if (!alive.current) return;
      if (result.kind === 'success') {
        accept(result.data, { productId: operation.productId, generation });
        setRowErrors((previous) => ({
          ...previous,
          [operation.productId]: '',
        }));
      } else if (
        (edits.current[operation.productId] ?? 'initial') === generation
      ) {
        setRowErrors((previous) => ({
          ...previous,
          [operation.productId]:
            result.kind === 'unknown'
              ? '保存結果未確認，可查詢原操作；本次購買數量仍保留。'
              : cartFailure(result.error.code),
        }));
        if (
          result.kind === 'failure' &&
          result.error.code === 'CART_VERSION_CONFLICT'
        )
          setReload(true);
      }
    } finally {
      rowActive.current.delete(operation.productId);
      if (alive.current) setRows([...rowActive.current]);
    }
  };
  const consumeDrafts = (ownership: Record<string, string>) => {
    const next = { ...drafts.current };
    for (const [productId, generation] of Object.entries(ownership)) {
      if ((edits.current[productId] ?? 'initial') !== generation) continue;
      const saved = viewRef.current?.items.find(
        (item) => item.productId === productId,
      );
      if (saved) next[productId] = String(saved.quantity);
      else delete next[productId];
      delete draftBases.current[productId];
      edits.current[productId] = crypto.randomUUID();
      setRowErrors((previous) => ({ ...previous, [productId]: '' }));
    }
    drafts.current = next;
    setDraft(next);
  };
  const create = async (request?: RecoveryRequest) => {
    if (!id || orderActive.current || !operations.isCurrentCart(id)) return;
    const submitted = { ...choices.current },
      submittedEdits = Object.fromEntries(
        Object.keys(submitted).map((productId) => [
          productId,
          edits.current[productId] ?? 'initial',
        ]),
      ),
      selectedItems = purchaseItems(submitted);
    if (!request && !selectedItems) {
      setError('請確認所選商品的購買量為正整數。');
      return;
    }
    const origin = location.current,
      navigation = navigationIntent.current;
    orderActive.current = true;
    setWorking(true);
    setError('');
    try {
      const result = request
        ? await operations.createOrder(
            id,
            undefined,
            undefined,
            request.selectionOwnership,
            request.requestId,
            request.draftOwnership,
          )
        : await operations.createOrder(
            id,
            {
              requestId: crypto.randomUUID(),
              selectedItems: selectedItems!,
              constraints: { currency: 'TWD' },
            },
            undefined,
            submitted,
            undefined,
            submittedEdits,
          );
      if (!alive.current) return;
      if (result.kind === 'success') {
        accept(result.data.cart);
        updateSelection(
          consumeSelection(
            choices.current,
            request?.selectionOwnership ?? submitted,
          ),
        );
        consumeDrafts(request?.draftOwnership ?? submittedEdits);
        setCreatedId(result.data.order.orderId);
        if (result.recoveryWarning)
          setError(
            '訂單已建立，但本機恢復資料保存失敗；請保留訂單連結，原請求仍保留供查詢。',
          );
        if (
          !request &&
          location.current === origin &&
          navigationIntent.current === navigation &&
          operations.isCurrentCart(id) &&
          Object.keys(choices.current).length === 0
        )
          router.push(`/orders/${result.data.order.orderId}?created=1`);
      } else
        setError(
          result.kind === 'unknown'
            ? '建立結果未確認，請先查詢結果；繼續原購買是獨立操作。'
            : cartFailure(result.error.code),
        );
    } finally {
      orderActive.current = false;
      if (alive.current) {
        setWorking(false);
        refreshRecovery();
      }
    }
  };
  const queryOrder = async (request: RecoveryRequest) => {
    const result = await queryRequest(storage, request, transport);
    if (!alive.current) return;
    if (
      result.kind === 'success' &&
      result.data.status === 'found' &&
      'order' in result.data
    ) {
      setCreatedId(result.data.order.orderId);
      updateSelection(
        consumeSelection(choices.current, request.selectionOwnership ?? {}),
      );
      consumeDrafts(request.draftOwnership ?? {});
      setError('已確認原訂單，不會重新生單。');
    } else
      setError(
        result.kind === 'success'
          ? '目前尚未找到結果，原購買仍可能稍後完成。'
          : '查詢未完成，原購買仍保留。',
      );
    refreshRecovery();
  };
  return {
    operations,
    view,
    draft,
    dirty,
    selected: Object.keys(selection),
    selection,
    setSelected,
    quote,
    quoteError,
    quoteLoading,
    refreshQuote: () => setQuoteRevision((n) => n + 1),
    validPurchase: Boolean(purchaseItems(selection)),
    error,
    rowErrors,
    loading,
    reload,
    working,
    rows,
    unknownOrder: orderRequests.length > 0,
    orderRequests,
    createdId,
    change,
    perform,
    create,
    queryOrder,
    load,
  };
}
