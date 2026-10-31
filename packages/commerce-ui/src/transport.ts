export type Transport = (path: string, body?: unknown) => Promise<Response>;
export const httpTransport: Transport = (path, body) =>
  fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
export type Storage = Pick<
  globalThis.Storage,
  'getItem' | 'setItem' | 'removeItem'
>;
export const browserStorage: Storage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
