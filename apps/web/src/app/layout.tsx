import { SiteHeader } from '@/features/cart/site-header';
import { OrderMemory } from '@/features/checkout/order-memory';
import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/features/cart/provider';

export const metadata: Metadata = {
  title: 'Agent-Ready Store',
  description: '為人與 AI 助理設計的選物商店',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <a className="skip" href="#main">
          跳至主要內容
        </a>
        <OrderMemory>
          <CartProvider>
            <SiteHeader />
            {children}
          </CartProvider>
        </OrderMemory>
        <footer>商品資訊為目前快照，實際庫存可能變動。</footer>
      </body>
    </html>
  );
}
