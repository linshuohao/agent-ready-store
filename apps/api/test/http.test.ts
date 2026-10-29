import { describe, it, expect } from 'vitest';
const base = process.env.API_BASE_URL;
(base ? describe : describe.skip)('HTTP public contract', () => {
  it('serves bounded summaries, details and comments with safe errors', async () => {
    const response = await fetch(`${base}/api/v1/products?limit=50`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const page = await response.json();
    expect(page).toMatchObject({
      ok: true,
      data: { total: 30, nextOffset: null },
    });
    expect(page.data.items).toHaveLength(30);
    expect(JSON.stringify(page)).not.toMatch(
      /margin_rate|recommendation_score/,
    );
    const detail = await (await fetch(`${base}/api/v1/products/P005`)).json();
    expect(detail.data).toHaveProperty('specs');
    expect(detail.data).not.toHaveProperty('reviews');
    const reviews = await (
      await fetch(`${base}/api/v1/products/P005/reviews?limit=1`)
    ).json();
    expect(reviews.data.items).toHaveLength(1);
    expect(reviews.data.nextOffset).toBe(1);
    for (const [path, status, code] of [
      ['?limit=51', 400, 'VALIDATION_ERROR'],
      ['?unknown=x', 400, 'VALIDATION_ERROR'],
      ['/P001?unknown=x', 400, 'VALIDATION_ERROR'],
      ['?purchasableOnly=wrong', 400, 'VALIDATION_ERROR'],
      ['?catalogRevision=old', 409, 'CATALOG_CHANGED'],
      ['/missing', 404, 'NOT_FOUND'],
    ]) {
      const r = await fetch(`${base}/api/v1/products${path}`);
      expect(r.status).toBe(status);
      expect(await r.json()).toMatchObject({ ok: false, error: { code } });
    }
  });
});
