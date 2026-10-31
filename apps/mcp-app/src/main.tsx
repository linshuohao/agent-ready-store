import { useMemo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { CommerceApplication } from '@store/commerce-ui/application';
import type { Navigation, RouteDelivery } from '@store/commerce-ui/runtime';
import {
  bridgeTransport,
  toolDeliveryContext,
  validateShare,
} from './bridge-adapter';
import '@store/commerce-ui/application.css';
declare const __CHECKOUT_ORIGIN__: string;
const app = new App(
  { name: 'Agent-Ready Store', version: 'commerce-shared-v5' },
  {},
  { autoResize: true },
);
const transport = bridgeTransport({
  call: (name, args) => app.callServerTool({ name, arguments: args }),
  open: (url) => app.openLink({ url }),
});
const storage = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  removeItem: (key: string) => sessionStorage.removeItem(key),
};
const root = createRoot(document.getElementById('root')!);
let snapshot = { location: '/', revision: 0, message: '' },
  routeKey: string | null = null;
const listeners = new Set<() => void>();
const deliveryListeners = new Set<(delivery: RouteDelivery) => void>();
let queued: RouteDelivery | null = null;
function update(patch: Partial<typeof snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}
function navigate(location: string) {
  try {
    if (routeKey) storage.setItem(routeKey, location);
  } catch {
    update({ message: '無法保存頁面接續位置，請檢查Host會話儲存。' });
    return;
  }
  update({ location, revision: snapshot.revision + 1, message: '' });
}
const navigation: Navigation = { push: navigate, replace: navigate };
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const subscribeDelivery = (listener: (delivery: RouteDelivery) => void) => {
  deliveryListeners.add(listener);
  if (queued) {
    const pending = queued;
    queued = null;
    listener(pending);
  }
  return () => {
    deliveryListeners.delete(listener);
  };
};
function View() {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  const runtime = useMemo(
    () => ({
      surface: 'embedded' as const,
      location: state.location,
      revision: state.revision,
      navigation,
      transport,
      storage,
      subscribeDelivery,
      share: async (url: string, orderId: string) => {
        const href = validateShare(url, __CHECKOUT_ORIGIN__, orderId);
        if (app.getHostCapabilities()?.openLinks === undefined)
          throw Error('OPEN_UNAVAILABLE');
        if ((await app.openLink({ url: href })).isError)
          throw Error('OPEN_REJECTED');
      },
    }),
    [state.location, state.revision],
  );
  return (
    <>
      {state.message && <p role="alert">{state.message}</p>}
      <CommerceApplication runtime={runtime} />
    </>
  );
}
let input: unknown;
let ready = false;
app.ontoolinput = (params) => {
  input = params.arguments;
};
app.ontoolresult = async (result) => {
  const args = input;
  input = undefined;
  try {
    const entry = document.body.dataset.entryTool!;
    const info = app.getHostContext()?.toolInfo;
    if (info?.tool.name && info.tool.name !== entry) throw Error('WRONG_TOOL');
    const context = toolDeliveryContext(entry, args, result, storage, info?.id);
    const delivery: RouteDelivery = {
      navigate: () => {
        routeKey = context.key;
        navigate(context.route);
        window.dispatchEvent(new Event('focus'));
      },
    };
    if (!ready) {
      delivery.navigate();
      ready = true;
      root.render(<View />);
    } else if (deliveryListeners.size)
      deliveryListeners.forEach((listener) => listener(delivery));
    else queued = delivery;
  } catch {
    const message =
      '無法核對原工具結果或恢復資料，請重新取得原商品、購物車或訂單；不會另建或支付。';
    if (ready) update({ message });
    else
      root.render(
        <main>
          <h1>商店視圖暫不可用</h1>
          <p role="alert">{message}</p>
        </main>,
      );
  }
};
app.onteardown = async () => {
  input = undefined;
  queued = null;
  listeners.clear();
  deliveryListeners.clear();
  root.unmount();
  return {};
};
try {
  await app.connect();
} catch {
  root.render(
    <main>
      <h1>商店視圖暫不可用</h1>
      <p role="status">
        Host Bridge 未連線，請重新連線。此視圖不會直接存取網站 API。
      </p>
    </main>,
  );
}
window.addEventListener(
  'pagehide',
  () => {
    input = undefined;
    queued = null;
    listeners.clear();
    deliveryListeners.clear();
    void app.close();
  },
  { once: true },
);
