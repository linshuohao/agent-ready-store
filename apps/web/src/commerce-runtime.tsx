'use client';
import { useMemo, type ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CommerceApplication } from '@store/commerce-ui/application';
import { httpTransport, browserStorage } from '@store/commerce-ui/transport';
import { PageTools } from './features/webmcp/page-tools';
export function WebCommerce({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const pathname = usePathname(),
    router = useRouter();
  const runtime = useMemo(
    () => ({
      Link: NextLink,
      location: pathname + (query ? `?${query}` : ''),
      navigation: router,
      transport: httpTransport,
      storage: browserStorage,
      PageTools,
      share: async (url: string, orderId: string) => {
        const target = new URL(url, window.location.origin);
        if (
          target.origin !== window.location.origin ||
          target.pathname !== `/orders/${orderId}` ||
          target.search !== '?view=share' ||
          target.hash ||
          target.username ||
          target.password
        )
          throw Error('UNSAFE_LINK');
        window.open(url, '_blank', 'noopener,noreferrer');
      },
    }),
    [pathname, query, router],
  );
  return (
    <CommerceApplication runtime={runtime}>{children}</CommerceApplication>
  );
}
