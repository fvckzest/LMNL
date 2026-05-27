'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import Blog from '../../src/pages/Blog';
import { RouterAdapterProvider } from '../../src/components/RouterAdapter';
import { ThemeProvider } from '../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function BlogRoute() {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <Blog />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
