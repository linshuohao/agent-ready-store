'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Only pin a panel that fits below the header; tall/error states stay scrollable
// with the page so no actions become trapped below the viewport.
export function PurchaseAside({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState({ fits: false, top: 0 });
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const header = panel
      .closest('.commerce-application')
      ?.querySelector('.site-header');
    const measure = () => {
      const top = (header?.getBoundingClientRect().height ?? 0) + 16;
      const fits =
        panel.getBoundingClientRect().height + top + 16 <= window.innerHeight;
      setLayout((previous) =>
        previous.fits === fits && previous.top === top
          ? previous
          : { fits, top },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    if (header) observer.observe(header);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <aside
      ref={ref}
      className="purchase-aside"
      aria-label={label}
      data-sticky={layout.fits}
      style={{ top: layout.top }}
    >
      {children}
    </aside>
  );
}
