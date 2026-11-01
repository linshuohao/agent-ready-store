import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  app: {} as Record<string, any>,
  render: vi.fn(),
  unmount: vi.fn(),
  delivery: vi.fn(() => ({ route: '/', key: null })),
  close: vi.fn(),
  connect: vi.fn(async () => {}),
}));
vi.mock('@modelcontextprotocol/ext-apps', () => ({
  App: class {
    constructor() {
      Object.assign(mocks.app, {
        connect: mocks.connect,
        close: mocks.close,
        getHostContext: () => undefined,
      });
      return mocks.app;
    }
  },
}));
vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: mocks.render, unmount: mocks.unmount }),
}));
vi.mock('../src/bridge-adapter', () => ({
  bridgeTransport: () => vi.fn(),
  toolDeliveryContext: mocks.delivery,
  validateShare: vi.fn(),
}));
vi.mock('@store/commerce-ui/application', () => ({
  CommerceApplication: () => null,
}));
vi.mock('@store/commerce-ui/application.css', () => ({}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
});
it.each(['teardown', 'pagehide'])(
  'ignores Host deliveries after %s',
  async (end) => {
    let hide!: () => void;
    vi.stubGlobal('document', {
      getElementById: () => ({}),
      body: { dataset: { entryTool: 'search_products' } },
    });
    vi.stubGlobal('window', {
      addEventListener: (_name: string, handler: () => void) => {
        hide = handler;
      },
      dispatchEvent: vi.fn(),
    });
    await import('../src/main');
    mocks.app.ontoolinput({ arguments: { q: 'before' } });
    if (end === 'teardown') await mocks.app.onteardown();
    else hide();
    mocks.app.ontoolinput({ arguments: { q: 'late' } });
    await mocks.app.ontoolresult({ structuredContent: { ok: true } });
    expect(mocks.delivery).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  },
);

it('does not render a connection failure after teardown', async () => {
  let reject!: (error: Error) => void;
  mocks.connect.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      }),
  );
  vi.stubGlobal('document', {
    getElementById: () => ({}),
    body: { dataset: { entryTool: 'search_products' } },
  });
  vi.stubGlobal('window', { addEventListener: vi.fn() });
  const loading = import('../src/main');
  await vi.waitFor(() => expect(mocks.connect).toHaveBeenCalled());
  await mocks.app.onteardown();
  reject(new Error('Host disconnected'));
  await loading;
  expect(mocks.unmount).toHaveBeenCalledOnce();
  expect(mocks.render).not.toHaveBeenCalled();
});
