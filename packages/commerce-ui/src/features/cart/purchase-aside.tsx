'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRuntime } from '../../runtime';
import { formatMoney } from '../../lib/money';

export function PurchaseAside({
  label,
  children,
  primaryAction,
  total,
  totalLabel = '應付金額',
}: {
  label: string;
  children: ReactNode;
  primaryAction: ReactNode;
  total: string | null;
  totalLabel?: string;
}) {
  const { surface = 'web' } = useRuntime();
  const ref = useRef<HTMLElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ ready: false, top: 0, fits: false });
  useEffect(() => {
    const column = ref.current,
      controls = dock.current;
    if (!column || !controls || surface !== 'web') return;
    const application = column.closest<HTMLElement>('.commerce-application');
    const header = application?.querySelector('.site-header');
    const measure = () => {
      const top = (header?.getBoundingClientRect().height ?? 0) + 16;
      const barHeight = controls.getBoundingClientRect().height;
      const fits =
        column.getBoundingClientRect().height + top + barHeight + 16 <=
        window.innerHeight;
      setLayout((previous) =>
        previous.top === top && previous.fits === fits && previous.ready
          ? previous
          : { ready: true, top, fits },
      );
      application?.style.setProperty(
        '--purchase-dock-space',
        `${barHeight + 16}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    observer.observe(controls);
    if (header) observer.observe(header);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      application?.style.removeProperty('--purchase-dock-space');
    };
  }, [surface]);
  return (
    <aside
      ref={ref}
      className="purchase-aside"
      aria-label={label}
      data-sticky={surface === 'web' && layout.fits}
      style={{ top: layout.top }}
    >
      {children}
      <div
        ref={dock}
        className="purchase-action-dock"
        data-docked={surface === 'web' && layout.ready}
        role="region"
        aria-label="金額與操作"
      >
        <div className="purchase-action-inner">
          <div className="purchase-action-total" aria-live="polite">
            <span>{totalLabel}</span>
            <strong>{total === null ? '待確認' : formatMoney(total)}</strong>
          </div>
          {primaryAction}
        </div>
      </div>
    </aside>
  );
}
