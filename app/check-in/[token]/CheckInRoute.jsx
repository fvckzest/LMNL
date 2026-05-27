'use client';

import { useCallback } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AdminProtectedRoute from '../../_admin/AdminProtectedRoute';
import CheckIn from '../../../src/pages/CheckIn';
import { RouterAdapterProvider } from '../../../src/components/RouterAdapter';
import { ThemeProvider } from '../../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function CheckInRoute({ token }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
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
        <AdminProtectedRoute>
          <CheckIn token={token} />
        </AdminProtectedRoute>
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
