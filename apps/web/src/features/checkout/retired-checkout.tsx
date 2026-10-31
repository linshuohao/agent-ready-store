import Link from 'next/link';
export function RetiredCheckout() {
  return (
    <main id="main" tabIndex={-1} className="commerce-page">
      <h1>訂單入口已更新</h1>
      <p>請從購物車進入新的訂單流程。舊連結不會轉換成新訂單或執行購買。</p>
      <Link href="/cart">前往購物車</Link>
    </main>
  );
}
