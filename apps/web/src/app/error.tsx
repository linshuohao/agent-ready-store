'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main tabIndex={-1} id="main" role="alert">
      <h1>暫時無法載入頁面</h1>
      <Button onClick={reset}>重新嘗試</Button>
    </main>
  );
}
