'use client';
import {
  createContext,
  useContext,
  type ComponentType,
  type ComponentProps,
} from 'react';
import type {
  Page,
  ProductSummary,
  ProductDetail,
  Result,
} from '@store/contracts';
import type { Transport, Storage } from './transport';
import { artwork } from './artwork';
export type PageToolsProps = {
  catalog?: Result<Page<ProductSummary>>;
  queryKey?: string;
  product?: ProductDetail;
  cartId?: string;
  readonly?: boolean;
  reviewId?: string;
  orderId?: string;
};
export type Navigation = {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
};
export type RouteDelivery = { navigate: () => void };
export type CommerceRuntime = {
  surface?: 'web' | 'embedded';
  revision?: number;
  subscribeDelivery?: (
    listener: (delivery: RouteDelivery) => void,
  ) => () => void;
  location: string;
  navigation: Navigation;
  transport: Transport;
  storage: Storage;
  PageTools?: ComponentType<PageToolsProps>;
  share: (url: string, orderId: string) => Promise<void>;
};
const Runtime = createContext<CommerceRuntime | null>(null);
export const CommerceRuntimeProvider = Runtime.Provider;
export function useRuntime() {
  const value = useContext(Runtime);
  if (!value) throw new Error('CommerceRuntimeProvider required');
  return value;
}
export const usePathname = () => useRuntime().location.split('?')[0];
export const useRouter = () => useRuntime().navigation;
export function Link({
  href,
  prefetch: _prefetch,
  onClick,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> & { href: string; prefetch?: boolean }) {
  void _prefetch;
  const { navigation } = useRuntime();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !props.target &&
          href.startsWith('/') &&
          !href.startsWith('//')
        ) {
          event.preventDefault();
          navigation.push(href);
        }
      }}
    />
  );
}
export function PageTools(props: PageToolsProps) {
  const Tools = useRuntime().PageTools;
  return Tools ? <Tools {...props} /> : null;
}
export function Artwork({
  kind,
  alt,
  ...props
}: Omit<ComponentProps<'img'>, 'src' | 'alt'> & { kind: string; alt: string }) {
  return (
    <img
      {...props}
      alt={alt}
      src={`data:image/svg+xml,${encodeURIComponent(artwork[kind])}`}
    />
  );
}
