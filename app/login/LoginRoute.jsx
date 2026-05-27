'use client';

import { useCallback } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RouterAdapterProvider } from '../../src/components/RouterAdapter';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import Login from '../../src/pages/Login';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

function buildSearchString(searchParams) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function LoginRoute({ searchParams }) {
  const pathname = usePathname();
  const router = useRouter();
  const search = buildSearchString(searchParams);
  const navigate = useCallback((to, options = {}) => {
    if (options?.replace) {
      router.replace(to);
      return;
    }

    router.push(to);
  }, [router]);

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, navigate, pathname, search }}>
        <Login />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
