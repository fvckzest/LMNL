import { useEffect } from 'react';

export function usePageColor(color) {
  useEffect(() => {
    if (!color) return undefined;

    document.documentElement.style.setProperty('--page-color', color);
    return () => document.documentElement.style.removeProperty('--page-color');
  }, [color]);
}
