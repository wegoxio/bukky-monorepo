'use client';

import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 300;

type ModalPresenceState = {
  shouldRender: boolean;
  isVisible: boolean;
};

export function useModalPresence(
  isOpen: boolean,
  durationMs = DEFAULT_DURATION_MS,
): ModalPresenceState {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let rafIdA: number | null = null;
    let rafIdB: number | null = null;

    if (isOpen) {
      setShouldRender(true);
      if (typeof window !== 'undefined') {
        rafIdA = window.requestAnimationFrame(() => {
          rafIdB = window.requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      } else {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, durationMs);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (rafIdA && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafIdA);
      }
      if (rafIdB && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafIdB);
      }
    };
  }, [durationMs, isOpen]);

  return { shouldRender, isVisible };
}
