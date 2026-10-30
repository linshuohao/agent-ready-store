'use client';
import { useEffect, useState } from 'react';

export function CartFeedback({
  children,
  success,
  onDismiss,
  label = '購物車操作狀態',
  dismissLabel = '關閉加入購物車提示',
}: {
  children: React.ReactNode;
  success: boolean;
  label?: string;
  dismissLabel?: string;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!success || hovered || focused) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [success, hovered, focused, onDismiss]);
  return (
    <aside
      className="cart-feedback"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {success && (
        <span className="cart-feedback-check" aria-hidden="true">
          ✓
        </span>
      )}
      <div className="cart-feedback-content">{children}</div>
      {success && (
        <button
          className="cart-feedback-close"
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </aside>
  );
}
