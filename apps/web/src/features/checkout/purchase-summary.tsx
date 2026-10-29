import type { PurchaseSummary as Summary } from '@store/contracts';
import { MoneyBreakdown } from '@/features/cart/money-breakdown';
export function PurchaseSummary({
  summary,
  completed = false,
}: {
  summary: Summary;
  completed?: boolean;
}) {
  return (
    <section aria-label={completed ? '成交內容' : '本次購買內容'}>
      <p>來源：{summary.origin === 'AGENT' ? 'AI 助理準備' : '自行選購'}</p>
      <ul>
        {summary.items.map((item) => (
          <li key={item.productId}>
            <strong>{item.name}</strong> · {item.productId} · {item.brand}
            <dl>
              {Object.entries(item.specs).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <MoneyBreakdown
        quote={summary.quote}
        mode={completed ? 'completed' : 'confirmation'}
      />
    </section>
  );
}

export function PurchaseChanges({
  before,
  after,
}: {
  before: Summary;
  after: Summary;
}) {
  const fields = (summary: Summary) => {
    const values: Record<string, string> = {
      購物車版本: String(summary.cartVersion),
      來源: summary.origin,
      幣別: summary.quote.currency,
    };
    for (const item of summary.items) {
      const prefix = item.productId + ' ';
      values[prefix + '商品名稱'] = item.name;
      values[prefix + '品牌'] = item.brand;
      values[prefix + '數量'] = String(item.quantity);
      values[prefix + '單價'] = item.unitPrice;
      values[prefix + '小計'] = item.lineSubtotal;
      for (const [key, value] of Object.entries(item.specs))
        values[prefix + key] = String(value);
    }
    for (const [label, value] of [
      ['商品小計', summary.quote.subtotal],
      ['全站滿減', summary.quote.thresholdDiscount],
      ['AI優惠', summary.quote.aiDiscount],
      ['運費', summary.quote.shipping],
      ['應付金額', summary.quote.total],
    ])
      values[label] = value;
    return values;
  };
  const a = fields(before),
    b = fields(after),
    keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
      (key) => a[key] !== b[key],
    );
  return (
    <section aria-label="購買內容變更" className="notice">
      <h2>請核對購買內容變更</h2>
      {keys.length ? (
        <ul>
          {keys.map((key) => (
            <li key={key}>
              {key}：{a[key] ?? '未包含'} → {b[key] ?? '未包含'}
            </li>
          ))}
        </ul>
      ) : (
        <p>購買內容未變更；確認資料已更新，仍需再次明確確認。</p>
      )}
    </section>
  );
}
