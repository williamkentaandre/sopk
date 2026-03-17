'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const OVERLAY_Z = 9996;
const RING_Z = 9997;
const TOOLTIP_Z = 9999;
const OFFSET = 16;
const TOOLTIP_MIN_EDGE = 12;
const TOOLTIP_WIDTH = 280;
const OVERLAY_OPACITY = 0.6;

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
      // Tooltip BELOW target so it never blocks the button
      const tooltipHeight = 64;
      let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      left = Math.max(TOOLTIP_MIN_EDGE, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MIN_EDGE));
      const top = rect.bottom + OFFSET;
      setTooltipRect({ top, left });
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
      {/* Dimmed overlay: 4 strips so the target area stays clickable */}
      <div
        role="presentation"
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: box.top,
          background: `rgba(0,0,0,${OVERLAY_OPACITY})`,
          zIndex: OVERLAY_Z,
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: box.top,
          left: 0,
          width: box.left,
          height: box.height,
          background: `rgba(0,0,0,${OVERLAY_OPACITY})`,
          zIndex: OVERLAY_Z,
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: box.top,
          left: box.left + box.width,
          right: 0,
          height: box.height,
          background: `rgba(0,0,0,${OVERLAY_OPACITY})`,
          zIndex: OVERLAY_Z,
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: box.bottom,
          left: 0,
          width: '100%',
          bottom: 0,
          background: `rgba(0,0,0,${OVERLAY_OPACITY})`,
          zIndex: OVERLAY_Z,
          pointerEvents: 'auto',
        }}
      />

      {/* Highlight ring around target */}
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
          zIndex: RING_Z,
          animation: 'onboarding-pulse 2s ease-in-out infinite',
        }}
      />

      {/* Tooltip below target (arrow points up), so it never blocks the button */}
      <div
        className="onboarding-spotlight-tooltip"
        style={{
          position: 'fixed',
          top: tooltipRect.top,
          left: tooltipRect.left,
          width: TOOLTIP_WIDTH,
          zIndex: TOOLTIP_Z,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          border: '1px solid var(--border)',
          padding: '0.75rem 2.25rem 0.75rem 0.75rem',
          fontSize: '0.95rem',
          lineHeight: 1.4,
          color: 'var(--text)',
          fontWeight: 500,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: arrowLeft - 8,
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--bg-card)',
            filter: 'drop-shadow(0 -1px 0 var(--border))',
          }}
        />
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
      </div>
    </>,
    document.body
  );
}
