import { randomUUID } from 'node:crypto';
export async function shared() {
  const call = async (name: string, args: Record<string, unknown>) => {
    const response = await fetch('http://localhost:3002/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MCP_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: randomUUID(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });
    return (await response.json()).result.structuredContent;
  };
  const created = await call('create_cart', {
    createRequestId: randomUUID(),
    items: [{ productId: 'P003', quantity: 1 }],
  });
  if (!created.ok) throw new Error('Fixture creation failed');
  const result = await call('create_handoff', {
    cartId: created.data.cart.cartId,
    cartAccessToken: created.data.cartAccessToken,
  });
  if (!result.ok) throw new Error('Fixture sharing failed');
  return result.data.handoff.url as string;
}
