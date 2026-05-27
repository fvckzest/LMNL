'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import ArtistInterest from '../../../src/pages/ArtistInterest';
import { RouterAdapterProvider } from '../../../src/components/RouterAdapter';
import { ThemeProvider } from '../../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function ArtistInterestRoute() {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <ArtistInterest />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
