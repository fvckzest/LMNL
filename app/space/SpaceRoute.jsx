'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import Space from '../../src/pages/Space';
import { RouterAdapterProvider } from '../../src/components/RouterAdapter';
import { ThemeProvider } from '../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function SpaceRoute() {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <Space />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
