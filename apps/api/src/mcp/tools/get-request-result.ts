import type { z } from 'zod';
import { requestResultInput } from '@store/contracts';
import type { CartService } from '../../cart/cart.service.js';
import type { ToolDefinition } from '../register-tools.js';

export function createGetRequestResult(
  carts: CartService,
): ToolDefinition<z.output<typeof requestResultInput>> {
  return {
    name: 'get_request_result',
    description:
      '只读核实原请求成功事实，不生单、改车或释放库存。order按原cartId+requestId；cart按原cartId或initializationId+操作请求键；initialize仅查询旧建车requestId。found返回原订单或当前车；not_found仅表示暂未观察到成功，不能当失败或自动继续/换键。明确继续新契约原操作须另行提交原键原载荷，旧载荷仅可查询。',
    inputSchema: requestResultInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    skipMaintenance: true,
    handler: (input) => carts.requestResult(input),
  };
}
