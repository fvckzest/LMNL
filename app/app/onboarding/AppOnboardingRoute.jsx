'use client';

import { useCallback } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CommunityAppRoute from '../../../src/components/CommunityAppRoute';
import { RouterAdapterProvider } from '../../../src/components/RouterAdapter';
import { ThemeProvider } from '../../../src/components/ThemeProvider';
import { useSupabaseSession } from '../../../src/hooks/useSupabaseSession';
import AppOnboarding from '../../../src/pages/AppOnboarding';

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

export default function AppOnboardingRoute({ searchParams }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSupabaseSession();
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
        <CommunityAppRoute session={session} allowIncomplete>
          <AppOnboarding />
        </CommunityAppRoute>
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
