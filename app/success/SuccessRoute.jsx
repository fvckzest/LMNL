'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import Success from '../../src/pages/Success';
import { RouterAdapterProvider } from '../../src/components/RouterAdapter';
import { ThemeProvider } from '../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function SuccessRoute({ searchParams }) {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <Success searchParams={searchParams} />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
