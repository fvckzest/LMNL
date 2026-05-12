import { useEffect, useRef, useState } from 'react';

let turnstileScriptPromise;

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-turnstile-script]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.turnstile), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error('Failed to load Cloudflare Turnstile.'));
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

export default function Turnstile({
  siteKey,
  onTokenChange,
  resetSignal = 0,
  theme = 'light',
  size = 'flexible',
  appearance = 'always',
  execution = 'render',
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [error, setError] = useState('');

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let isMounted = true;

    async function renderWidget() {
      try {
        const turnstile = await loadTurnstileScript();
        if (!isMounted || !turnstile || !containerRef.current) {
          return;
        }

        if (widgetIdRef.current !== null) {
          turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          appearance,
          execution,
          callback(token) {
            onTokenChangeRef.current(token);
            setError('');
          },
          'error-callback'() {
            onTokenChangeRef.current('');
            setError('Security check unavailable right now. Please retry or email hi@lmnl.art.');
          },
          'expired-callback'() {
            onTokenChangeRef.current('');
          },
          'timeout-callback'() {
            onTokenChangeRef.current('');
            setError('Security check timed out. Please retry.');
          },
          'unsupported-callback'() {
            onTokenChangeRef.current('');
            setError('Security check is unavailable here. Please retry or email hi@lmnl.art.');
          },
        });
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Security check unavailable right now. Please retry or email hi@lmnl.art.');
        }
      }
    }

    renderWidget();

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [appearance, execution, resetSignal, siteKey, size, theme]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="turnstile-block">
      <div ref={containerRef} />
      {error ? <p className="turnstile-error">{error}</p> : null}
    </div>
  );
}
