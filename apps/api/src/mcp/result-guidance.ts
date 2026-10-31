import type { Result } from '@store/contracts';

/** Model-facing context only; does not retry, mutate, or classify payment success. */
export function mcpResult<T>(value: Result<T>) {
  const environment = {
    mode: 'simulation',
    realPayment: false,
    fulfillment: false,
  } as const;
  if (value.ok) return { ...value, environment };
  const code = value.error.code;
  const recovery =
    code === 'TEMPORARY_UNAVAILABLE'
      ? '结果可能未知；写操作按原请求键及原载荷恢复或读取原订单，不换键、不创建替代车或订单。'
      : code === 'SPEC_MISMATCH'
        ? '确定失败；核对constraintViolations与商品原文规格。不翻译键值、不删除用户硬约束；确属参数错误时修正后用新请求键提交。'
        : code === 'BUDGET_EXCEEDED'
          ? '确定失败；核对constraintViolations中的金额（总额含运费）。不提高预算；仅在原授权范围内重新选品，否则停止说明。'
          : code === 'VALIDATION_ERROR'
            ? '确定失败；按当前工具schema修正非法参数，保留用户硬条件；修正载荷后使用新请求键，不用原键发送不同载荷。'
            : ['CART_VERSION_CONFLICT', 'SELECTION_CHANGED'].includes(code)
              ? '确定失败；重读原购物车并核对完整目标及数量，不用新版本自动重放旧编辑。'
              : code === 'REQUEST_CONFLICT'
                ? '请求键与载荷冲突；核对并恢复原请求，不换键绕过冲突。'
                : '操作未完成；按错误码核对原目标，不能盲目重试、缩单或创建替代订单。';
  return {
    ...value,
    environment,
    recovery:
      recovery +
      ' 若本轮已调用展示工具，本轮只说明结果，后续再恢复，不新增卡片。',
  };
}
