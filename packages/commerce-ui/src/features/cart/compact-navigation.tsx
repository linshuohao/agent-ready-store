import { Button } from '../../components/ui/button';

export type PurchaseView = 'overview' | 'items' | 'fees';
export function CompactNavigation({
  value,
  onChange,
  count,
  disabled = false,
}: {
  value: PurchaseView;
  onChange: (value: PurchaseView) => void;
  count: number;
  disabled?: boolean;
}) {
  return (
    <nav className="purchase-view-switch" aria-label="卡片內容">
      {(
        [
          ['overview', '概覽'],
          ['items', `商品（${count}）`],
          ['fees', '費用明細'],
        ] as const
      ).map(([key, label]) => (
        <Button
          key={key}
          variant={value === key ? 'default' : 'outline'}
          aria-current={value === key ? 'page' : undefined}
          disabled={disabled}
          onClick={() => onChange(key)}
        >
          {label}
        </Button>
      ))}
    </nav>
  );
}
export function ItemPagination({
  page,
  pages,
  onChange,
  disabled = false,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="purchase-pagination" aria-label="明細分頁">
      <Button
        variant="outline"
        disabled={disabled || page === 0}
        onClick={() => onChange(page - 1)}
      >
        上一頁
      </Button>
      <span role="status">
        第 {page + 1} / {pages} 頁
      </span>
      <Button
        variant="outline"
        disabled={disabled || page + 1 >= pages}
        onClick={() => onChange(page + 1)}
      >
        下一頁
      </Button>
    </nav>
  );
}
