import { lazy } from 'react';

const RETRY_KEY = 'lmnl:lazy-retry';

function shouldReloadForChunkError(error) {
  const message = String(error?.message || error || '');

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Unable to preload CSS') ||
    error?.name === 'ChunkLoadError'
  );
}

export function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(RETRY_KEY);
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && shouldReloadForChunkError(error)) {
        const hasRetried = sessionStorage.getItem(RETRY_KEY) === '1';

        if (!hasRetried) {
          sessionStorage.setItem(RETRY_KEY, '1');
          window.location.reload();
          return new Promise(() => {});
        }
      }

      sessionStorage.removeItem(RETRY_KEY);
      throw error;
    }
  });
}
