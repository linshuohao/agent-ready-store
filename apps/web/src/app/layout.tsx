import type { Metadata } from 'next';
import { WebCommerce } from '../commerce-runtime';
import './globals.css';
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
        <WebCommerce>{children}</WebCommerce>
      </body>
    </html>
  );
}
