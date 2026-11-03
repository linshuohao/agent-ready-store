import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import {
  CommerceRuntimeProvider,
  Link,
  type CommerceRuntime,
} from '../src/runtime';
import type { ComponentProps } from 'react';

it('lets the environment own link rendering and receives the explicit prefetch policy', () => {
  function EnvironmentLink({
    href,
    prefetch,
    children,
  }: ComponentProps<'a'> & { prefetch?: boolean }) {
    // A host may resolve navigation differently; the shared UI must not replace it.
    return h(
      'a',
      {
        href: `https://host.example${href}`,
        'data-prefetch': String(prefetch),
      },
      children,
    );
  }
  const runtime: CommerceRuntime = {
    location: '/',
    navigation: { push() {}, replace() {} },
    transport: async () => Response.json({}),
    storage: { getItem: () => null, setItem() {}, removeItem() {} },
    share: async () => {},
    Link: EnvironmentLink,
  };
  const html = renderToStaticMarkup(
    h(
      CommerceRuntimeProvider,
      { value: runtime },
      h(Link, { href: '/cart', prefetch: false }, 'Cart'),
    ),
  );
  expect(html).toContain('href="https://host.example/cart"');
  expect(html).toContain('data-prefetch="false"');
});

it('keeps embedded links as normal anchors before client navigation', () => {
  const runtime: CommerceRuntime = {
    location: '/',
    navigation: { push() {}, replace() {} },
    transport: async () => Response.json({}),
    storage: { getItem: () => null, setItem() {}, removeItem() {} },
    share: async () => {},
  };
  const html = renderToStaticMarkup(
    h(
      CommerceRuntimeProvider,
      { value: runtime },
      h(Link, { href: '/orders/example', target: '_blank' }, 'Order'),
    ),
  );
  expect(html).toContain('href="/orders/example"');
  expect(html).toContain('target="_blank"');
});
