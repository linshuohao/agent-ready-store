'use client';
import { CategorySelect, type CategoriesResult } from './category-select';
import { Link } from '../../../runtime';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { useRouter } from '../../../runtime';
import { useTransition } from 'react';
export function SearchForm({
  values,
  categories,
}: {
  values: Record<string, string>;
  categories?: CategoriesResult;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="filters"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const [key, value] of data) {
          if (
            typeof value === 'string' &&
            (key === 'category' ? value !== '' : value.trim() !== '')
          ) {
            const text = key === 'category' ? value : value.trim();
            params.set(
              key,
              key === 'minPrice' || key === 'maxPrice'
                ? (Number(text) === 0 ? 0 : Number(text)).toLocaleString(
                    'en-US',
                    {
                      useGrouping: false,
                      maximumFractionDigits: 20,
                    },
                  )
                : text,
            );
          }
        }
        startTransition(() => router.push(`/?${params}`));
      }}
    >
      <Label className="field search">
        搜尋商品
        <Input
          name="q"
          type="search"
          maxLength={200}
          defaultValue={values.q ?? ''}
          placeholder="商品名稱、品牌或描述"
        />
      </Label>
      <CategorySelect
        key={categories?.ok ? categories.data.catalogRevision : 'unavailable'}
        initial={categories}
        value={values.category}
      />
      <Label className="field">
        品牌
        <Input
          name="brand"
          defaultValue={values.brand ?? ''}
          placeholder="精確品牌名稱"
        />
      </Label>
      <Label className="field">
        最低價格
        <Input
          name="minPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={values.minPrice ?? ''}
        />
      </Label>
      <Label className="field">
        最高價格
        <Input
          name="maxPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={values.maxPrice ?? ''}
        />
      </Label>
      <div className="check">
        <Checkbox
          id="purchasable-only"
          name="purchasableOnly"
          value="true"
          defaultChecked={values.purchasableOnly === 'true'}
        />
        <Label htmlFor="purchasable-only">只看可購買商品</Label>
      </div>
      <div className="filter-actions">
        <Button type="submit" disabled={pending}>
          {pending ? '正在更新…' : '套用篩選'}
        </Button>
        <Link className={buttonVariants({ variant: 'outline' })} href="/">
          清除條件
        </Link>
      </div>
      <p className="hint">依原始推薦分數排序。同分依商品 ID 排序。</p>
      {pending && <p role="status">正在更新結果，以下內容仍為上一組查詢。</p>}
    </form>
  );
}
