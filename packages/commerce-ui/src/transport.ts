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
> & {
  keys?: () => string[];
  withLock?: <T>(name: string, work: () => T) => Promise<T>;
};
export const browserStorage: Storage = {
  keys: () => Object.keys(localStorage),
  withLock: async (name, work) => {
    if (!navigator.locks) throw Error('INITIALIZATION_LOCK_UNAVAILABLE');
    return navigator.locks.request(name, work);
  },
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
