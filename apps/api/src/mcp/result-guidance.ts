import type { Result } from '@store/contracts';

/** Model-facing context only; does not retry, mutate, or classify payment success. */
export function mcpResult<T>(value: Result<T>, toolRecovery?: string) {
  const environment = {
    mode: 'simulation',
    realPayment: false,
    fulfillment: false,
  } as const;
  if (value.ok) return { ...value, environment };
  const code = value.error.code;
  // Tool-specific failures already carry their recovery decision. This layer
  // owns only common validation/availability guidance and the protocol envelope.
  const recovery =
    toolRecovery ??
    (code === 'TEMPORARY_UNAVAILABLE'
      ? '结果可能未知；先用get_request_result只读查询。只有明确继续原操作才按原请求键及原载荷发送，可能完成原生单或改车；旧契约请求只可查询。不换键、不创建替代车或订单。'
      : code === 'VALIDATION_ERROR'
        ? '确定失败；按当前工具schema修正非法参数，保留用户硬条件；修正载荷后使用新请求键，不用原键发送不同载荷。'
        : '操作未完成；按错误码核对原目标，不能盲目重试、缩单或创建替代订单。');
  return {
    ...value,
    environment,
    recovery:
      recovery +
      ' 若本轮已调用展示工具，本轮只说明结果，后续再恢复，不新增卡片。',
  };
}
