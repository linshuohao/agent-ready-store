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
  'create_cart',
  'get_cart',
  'update_cart',
  'create_handoff',
];
const entry = document.body.dataset.entryTool as EntryTool;
if (!allowed.includes(entry)) throw new Error('Invalid resource entry');
const app = new App(
  { name: 'Agent-Ready Store', version: 's6-v1' },
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
  );
};
app.onteardown = async () => {
  input = undefined;
  controller.dispose();
  root.unmount();
  return {};
};
const actions = {
  change: (id: string, value: string) => controller.change(id, value),
  remove: (id: string) => controller.remove(id),
  save: () => {
    void controller.save();
  },
  reload: (discard: boolean) => {
    void controller.reload(discard);
  },
  checkout: () => {
    void controller.checkout();
  },
};
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
    controller.dispose();
    void app.close();
  },
  { once: true },
);
