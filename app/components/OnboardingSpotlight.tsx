'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const OFFSET = 12;
const TOOLTIP_MIN_EDGE = 16;

interface OnboardingSpotlightProps {
  targetRef: React.RefObject<HTMLElement | null>;
  label: string;
  skipLabel?: string;
  onDismiss: () => void;
}

export function OnboardingSpotlight({ targetRef, label, skipLabel = 'Skip guide', onDismiss }: OnboardingSpotlightProps) {
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipRect, setTooltipRect] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const el = targetRef.current;
      if (!el) {
        setBox(null);
        setTooltipRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      // Tooltip above target, centered; arrow will point down to target
      const tooltipWidth = 280;
      const tooltipHeight = 56;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      left = Math.max(TOOLTIP_MIN_EDGE, Math.min(left, window.innerWidth - tooltipWidth - TOOLTIP_MIN_EDGE));
      const top = rect.top - tooltipHeight - OFFSET;
      setTooltipRect({ top: Math.max(TOOLTIP_MIN_EDGE, top), left });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [targetRef]);

  if (!box || !tooltipRect) return null;

  const arrowLeft = box.left + box.width / 2 - tooltipRect.left;

  return createPortal(
    <>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'transparent',
        }}
      />
      <div
        className="onboarding-spotlight-tooltip"
        style={{
          position: 'fixed',
          top: tooltipRect.top,
          left: tooltipRect.left,
          width: 280,
          zIndex: 9999,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          padding: '0.75rem 2.25rem 0.75rem 0.75rem',
          fontSize: '0.9rem',
          lineHeight: 1.4,
          color: 'var(--text)',
        }}
      >
        <p style={{ margin: 0 }}>{label}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={skipLabel}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            width: 24,
            height: 24,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: 4,
            fontSize: '1.1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--border)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          ✕
        </button>
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: arrowLeft - 8,
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid var(--bg-card)',
            filter: 'drop-shadow(0 1px 0 var(--border))',
          }}
        />
      </div>
      <div
        className="onboarding-spotlight-ring"
        style={{
          position: 'fixed',
          top: box.top - 4,
          left: box.left - 4,
          width: box.width + 8,
          height: box.height + 8,
          borderRadius: 8,
          boxShadow: '0 0 0 3px var(--primary)',
          pointerEvents: 'none',
          zIndex: 9997,
          animation: 'onboarding-pulse 2s ease-in-out infinite',
        }}
      />
    </>,
    document.body
  );
}
