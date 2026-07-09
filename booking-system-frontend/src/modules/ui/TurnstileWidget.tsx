'use client';

import { useEffect, useRef, useState } from 'react';

type TurnstileTheme = 'auto' | 'light' | 'dark';
type TurnstileSize = 'normal' | 'compact' | 'flexible';

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileInstance = {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
    __turnstileLoaderPromise?: Promise<TurnstileInstance>;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  action?: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  refreshKey?: string | number;
  className?: string;
};

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function getCspNonce(): string | undefined {
  return (
    document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content.trim() || undefined
  );
}

function loadTurnstileScript(): Promise<TurnstileInstance> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile solo funciona en el navegador.'));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (window.__turnstileLoaderPromise) {
    return window.__turnstileLoaderPromise;
  }

  window.__turnstileLoaderPromise = new Promise<TurnstileInstance>((resolve, reject) => {
    const resolveLoaded = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }

      reject(new Error('Turnstile no se inicializó correctamente.'));
    };

    const existingScript = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', resolveLoaded, { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('No se pudo cargar el script de Turnstile.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    const nonce = getCspNonce();

    if (nonce) {
      script.nonce = nonce;
    }

    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolveLoaded;
    script.onerror = () => reject(new Error('No se pudo cargar el script de Turnstile.'));
    document.head.appendChild(script);
  }).catch((error) => {
    window.__turnstileLoaderPromise = undefined;
    throw error;
  });

  return window.__turnstileLoaderPromise;
}

export default function TurnstileWidget({
  siteKey,
  onTokenChange,
  action,
  theme = 'auto',
  size = 'flexible',
  refreshKey,
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let active = true;
    const normalizedSiteKey = siteKey.trim();

    if (!normalizedSiteKey) {
      setErrorMessage('Falta configurar la clave pública de captcha.');
      onTokenChange(null);
      return;
    }

    onTokenChange(null);
    setErrorMessage('');

    void loadTurnstileScript()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;

        if (widgetIdRef.current) {
          turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: normalizedSiteKey,
          action,
          theme,
          size,
          callback: (token: string) => onTokenChange(token),
          'expired-callback': () => onTokenChange(null),
          'error-callback': () => onTokenChange(null),
        });
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo inicializar la verificación de seguridad.',
        );
        onTokenChange(null);
      });

    return () => {
      active = false;
      if (typeof window === 'undefined' || !window.turnstile || !widgetIdRef.current) return;
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      onTokenChange(null);
    };
  }, [action, onTokenChange, siteKey, size, theme]);

  useEffect(() => {
    if (refreshKey === undefined) return;
    if (typeof window === 'undefined' || !window.turnstile || !widgetIdRef.current) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenChange(null);
  }, [onTokenChange, refreshKey]);

  return (
    <div className={className}>
      <div ref={containerRef} />
      {errorMessage ? <p className="mt-1 text-xs text-danger">{errorMessage}</p> : null}
    </div>
  );
}
