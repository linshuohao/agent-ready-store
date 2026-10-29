import Link from 'next/link';
export default function NotFound() {
  return (
    <main tabIndex={-1} id="main">
      <h1>找不到這件商品</h1>
      <p>請確認商品 ID 或返回列表。</p>
      <Link href="/">返回商品列表</Link>
    </main>
  );
}
