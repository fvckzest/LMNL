'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import Community from '../../src/pages/Community';
import { RouterAdapterProvider } from '../../src/components/RouterAdapter';
import { ThemeProvider } from '../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function CommunityRoute() {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <Community />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
