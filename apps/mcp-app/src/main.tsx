import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { StoreController, type EntryTool } from './controller';
import { StoreView } from './view';
import './style.css';
declare const __CHECKOUT_ORIGIN__: string;
const allowed: EntryTool[] = [
  'search_products',
  'get_product',
  'get_or_create_cart',
  'get_cart',
  'add_cart_item',
  'update_cart_item',
  'remove_cart_item',
  'create_order',
  'get_order',
  'list_orders',
  'cancel_order',
];
const entry = document.body.dataset.entryTool as EntryTool;
if (!allowed.includes(entry)) throw new Error('Invalid resource entry');
const app = new App(
  { name: 'Agent-Ready Store', version: 'checkout-lifecycle-v1' },
  {},
  { autoResize: true },
);
const controller = new StoreController(
  entry,
  {
    call: (name, args) => app.callServerTool({ name, arguments: args }),
    open: (url) => app.openLink({ url }),
    canOpen: () => app.getHostCapabilities()?.openLinks !== undefined,
  },
  __CHECKOUT_ORIGIN__,
  {
    getItem: (key) => sessionStorage.getItem(key),
    setItem: (key, value) => sessionStorage.setItem(key, value),
    removeItem: (key) => sessionStorage.removeItem(key),
  },
);
let input: unknown;
app.ontoolinput = (params) => {
  input = params.arguments;
  controller.prepareInput(input);
};
app.ontoolresult = async (result) => {
  const completeInput = input;
  input = undefined;
  await controller.receive(
    completeInput,
    result,
    app.getHostContext()?.toolInfo?.tool.name,
    app.getHostContext()?.toolInfo?.id,
  );
};
app.onteardown = async () => {
  input = undefined;
  cleanup();
  controller.dispose();
  root.unmount();
  return {};
};
const actions = {
  change: (id: string, value: string) => controller.change(id, value),
  save: (id: string) => {
    void controller.save(id);
  },
  remove: (id: string) => {
    void controller.remove(id);
  },
  add: (id: string) => {
    void controller.add(id);
  },
  select: (id: string, value: boolean) => {
    void controller.select(id, value);
  },
  selectAll: (value: boolean) => {
    void controller.selectAll(value);
  },
  reload: (discard = false) => {
    void controller.reload(discard);
  },
  checkout: () => {
    void controller.checkout();
  },
  pay: () => {
    void controller.pay();
  },
  cancel: () => {
    void controller.cancel();
  },
  retry: () => {
    void controller.retry();
  },
  share: () => {
    void controller.share();
  },
  openOrder: (id: string) => {
    void controller.openOrder(id);
  },
  listOrders: (offset = 0) => {
    void controller.listOrders(offset);
  },
  continueShopping: (confirm = false) => {
    void controller.continueShopping(confirm);
  },
  dismissContinue: () => controller.dismissContinue(),
};
let lostFocus = false;
const onBlur = () => {
  lostFocus = true;
};
const onFocus = () => {
  if (lostFocus) {
    lostFocus = false;
    void controller.foreground();
  }
};
const onVisibility = () => {
  if (document.visibilityState === 'visible') void controller.foreground();
};
window.addEventListener('blur', onBlur);
window.addEventListener('focus', onFocus);
document.addEventListener('visibilitychange', onVisibility);
const deadlineTimer = setInterval(() => {
  const o = controller.getSnapshot().order;
  if (
    o?.effectiveStatus === 'CHECKOUT' &&
    Date.parse(o.reservationExpiresAt) <= Date.now() &&
    !controller.getSnapshot().busy
  )
    void controller.reload();
}, 15000);
function cleanup() {
  clearInterval(deadlineTimer);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('focus', onFocus);
  document.removeEventListener('visibilitychange', onVisibility);
}
function View() {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  return <StoreView state={state} actions={actions} />;
}
const root = createRoot(document.getElementById('root')!);
root.render(<View />);
try {
  await app.connect();
} catch {
  root.render(
    <main>
      <h1>商店視圖暫不可用</h1>
      <p role="status">
        Host Bridge 未連線。仍可請 Agent 使用原商店工具；此視圖不會直接存取網站
        API。
      </p>
    </main>,
  );
}

window.addEventListener(
  'pagehide',
  () => {
    input = undefined;
    cleanup();
    controller.dispose();
    void app.close();
  },
  { once: true },
);
