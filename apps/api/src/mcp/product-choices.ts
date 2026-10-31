import { createHash, randomBytes } from 'node:crypto';
import {
  createRequestStateCodec,
  inputRequired,
  inputResponse,
  type ServerContext,
  type InputRequiredResult,
} from '@modelcontextprotocol/server';
import { groupedSearchInput, type ProductDetail } from '@store/contracts';
import { z } from 'zod';
import type { CatalogService } from '../catalog/catalog.service.js';
import { AppError } from '../shared/app-error.js';
export const productChoicesInput = z
  .object({
    queries: groupedSearchInput.shape.queries,
    choices: z.record(z.string(), z.string().min(1).max(64)).optional(),
  })
  .strict()
  .refine((v) => new Set(v.queries.map((q) => q.id)).size === v.queries.length);
type ChoiceState = {
  fingerprint: string;
  fields: {
    key: string;
    id: string;
    candidates: { id: string; price: string }[];
  }[];
};
export function createChoiceCodec() {
  return createRequestStateCodec<ChoiceState>({
    key: randomBytes(32),
    ttlSeconds: 600,
    bind: (ctx) =>
      `${ctx.mcpReq.method}\0${ctx.http?.req?.headers.get('authorization') ?? ''}`,
  });
}
type Codec = ReturnType<typeof createChoiceCodec>;
export async function resolveProductChoices(
  input: unknown,
  catalog: CatalogService,
  ctx: ServerContext,
  modern: boolean,
  codec: Codec,
): Promise<Record<string, unknown> | InputRequiredResult> {
  const parsed = productChoicesInput.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
  const { queries, choices = {} } = parsed.data;
  if (Object.keys(choices).some((id) => !queries.some((q) => q.id === id)))
    throw new AppError('VALIDATION_ERROR', 400);
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(parsed.data))
    .digest('hex');
  const state = ctx.mcpReq.requestState<ChoiceState>();
  const answer = inputResponse(ctx.mcpReq.inputResponses, 'products');
  if (state && state.fingerprint !== fingerprint)
    throw new AppError('VALIDATION_ERROR', 400);
  if (state && answer.kind === 'elicit' && answer.action !== 'accept')
    return { kind: 'selection_cancelled', action: answer.action, queries };
  const stock = await catalog.stock();
  const groups = queries.map((query) => {
    const { id, label, ...conditions } = query;
    const page = catalog.catalog.search(
      { ...conditions, offset: 0, limit: 10, purchasableOnly: true },
      stock,
    );
    return {
      id,
      label: label ?? (query.q || '全部商品'),
      query,
      total: page.total,
      candidates: page.items.map((p) => catalog.catalog.get(p.id, stock)),
    };
  });
  const required = (reason: string) => ({
    kind: 'selection_required',
    reason,
    groups,
    choices,
  });
  if (state && answer.kind === 'missing') return required('stale_selection');
  if (!state && answer.kind !== 'missing') return required('stale_selection');
  const selected: Record<string, string> = Object.assign(
    Object.create(null),
    choices,
  );
  if (state) {
    if (
      answer.kind !== 'elicit' ||
      answer.action !== 'accept' ||
      !answer.content
    )
      return required('stale_selection');
    if (Object.keys(answer.content).length !== state.fields.length)
      return required('stale_selection');
    for (const field of state.fields) {
      const id = answer.content[field.key];
      if (typeof id !== 'string') return required('stale_selection');
      const offered = field.candidates.find((p) => p.id === id);
      const current = groups
        .find((g) => g.id === field.id)
        ?.candidates.find((p) => p.id === id);
      if (!offered || !current || offered.price !== current.price)
        return required('stale_selection');
      selected[field.id] = id;
    }
  }
  for (const [id, productId] of Object.entries(selected)) {
    const group = groups.find((g) => g.id === id)!;
    // Explicit IDs are checked against all matching candidates, not a truncated first page.
    const { id: _id, label: _label, ...conditions } = group.query;
    void _id;
    void _label;
    const all = catalog.catalog.search(
      { ...conditions, offset: 0, limit: 50, purchasableOnly: true },
      stock,
    );
    if (!all.items.some((p) => p.id === productId))
      return required('stale_selection');
  }
  const unresolved = groups.filter((g) => !Object.hasOwn(selected, g.id));
  if (!unresolved.length)
    return { kind: 'selection_resolved', queries, choices: selected };
  if (state) return required('stale_selection');
  if (unresolved.some((g) => g.total === 0)) return required('no_candidates');
  if (unresolved.some((g) => g.total > 10)) return required('needs_narrowing');
  if (!modern) return required('unsupported');
  const fields = unresolved.map((g, i) => ({
    key: `choice_${i + 1}`,
    id: g.id,
    candidates: g.candidates.map((p) => ({ id: p.id, price: p.price })),
  }));
  const properties: Record<string, z.ZodEnum<Record<string, string>>> = {};
  const describe = (p: ProductDetail) =>
    `${p.id} · ${p.name} · ${p.brand} · TWD ${p.price} · ${JSON.stringify(p.specs)}`;
  for (const [i, group] of unresolved.entries())
    properties[`choice_${i + 1}`] = z
      .enum(group.candidates.map((p) => p.id))
      .meta({
        title: group.label,
        description: group.candidates.map(describe).join('\n'),
      });
  return inputRequired({
    inputRequests: {
      products: inputRequired.elicit({
        message: '请按目标选择商品型号；此选择不会加购、下单或付款。',
        requestedSchema: z.object(properties),
      }),
    },
    requestState: await codec.mint({ fingerprint, fields }, ctx),
  });
}
