import { useEffect, useId, useRef, useState } from 'react';
import * as I from './Icons.jsx';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
let scrollLocks = 0;
let overflowBeforeLayers = '';

function InteractionLayer({ variant, title, eyebrow, onClose, children, footer }) {
  const [phase, setPhase] = useState('entering');
  const panelRef = useRef(null);
  const titleId = useId();
  const closeTimer = useRef(null);
  const closing = useRef(false);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    setPhase('closing');
    closeTimer.current = window.setTimeout(onClose, 160);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPhase('open'));
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    if (scrollLocks === 0) overflowBeforeLayers = document.body.style.overflow;
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector('[data-layer-close]')?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = overflowBeforeLayers;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])]
      .filter((element) => element.getClientRects().length > 0);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`interaction-layer ${variant}-layer`} data-phase={phase} onKeyDown={onKeyDown}>
      {variant !== 'push' && <div className="layer-backdrop" aria-hidden="true" onClick={variant === 'sheet' ? requestClose : undefined} />}
      <section
        ref={panelRef}
        className="layer-panel"
        role={variant === 'confirm' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="layer-header">
          <button type="button" className="layer-close" data-layer-close onClick={requestClose} aria-label={variant === 'sheet' ? 'Close' : 'Back'}>
            {variant === 'sheet' ? <I.Plus size={20} style={{ transform: 'rotate(45deg)' }} /> : <I.Chevron size={21} style={{ transform: 'rotate(180deg)' }} />}
          </button>
          <div className="layer-heading">
            {eyebrow && <span>{eyebrow}</span>}
            <h1 id={titleId}>{title}</h1>
          </div>
          <span className="layer-header-spacer" aria-hidden="true" />
        </header>
        <div className="layer-body">{children}</div>
        {footer && <footer className="layer-footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function PushLayer(props) {
  return <InteractionLayer {...props} variant="push" />;
}

export function SheetLayer(props) {
  return <InteractionLayer {...props} variant="sheet" />;
}

export function ConfirmLayer(props) {
  return <InteractionLayer {...props} variant="confirm" />;
}
