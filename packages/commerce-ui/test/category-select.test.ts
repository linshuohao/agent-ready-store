import { it, expect } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchForm } from '../src/features/product-discovery/components/search-form';
import { CommerceRuntimeProvider, type CommerceRuntime } from '../src/runtime';
const runtime = {
  navigation: { push() {}, replace() {} },
  transport: () => {
    throw new Error('must not fetch while rendering');
  },
} as unknown as CommerceRuntime;
it('renders shared category options with a retained unknown URL value and no invented categories', () => {
  const html = renderToStaticMarkup(
    h(
      CommerceRuntimeProvider,
      { value: runtime },
      h(SearchForm, {
        values: { category: 'missing' },
        categories: {
          ok: true,
          requestId: 'test',
          data: {
            items: [
              { value: ' A ', label: ' A ' },
              { value: '<script>', label: '<script>' },
            ],
            total: 3,
            nextOffset: 2,
            catalogRevision: 'rev',
          },
        },
      }),
    ),
  );
  expect(html).toContain('<select');
  expect(html).toContain('value=" A "');
  expect(html).toContain('value="missing" selected');
  expect(html).toContain('尚未出現在已載入分類');
  expect(html).toContain('載入更多分類');
  expect(html).not.toContain('<script>');
});
it('shows category failure without removing a selected condition or other filters', () => {
  const html = renderToStaticMarkup(
    h(
      CommerceRuntimeProvider,
      { value: runtime },
      h(SearchForm, {
        values: { category: ' A ', brand: 'Brand', maxPrice: '200' },
        categories: {
          ok: false,
          requestId: 'test',
          error: {
            code: 'TEMPORARY_UNAVAILABLE',
            message: 'failed',
            retryable: true,
          },
        },
      }),
    ),
  );
  expect(html).toContain('重新載入分類');
  expect(html).toContain('value=" A " selected');
  expect(html).toContain('value="Brand"');
});
