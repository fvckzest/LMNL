'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import GenericPage from '../../src/pages/GenericPage';
import { RouterAdapterProvider } from '../../src/components/RouterAdapter';
import { ThemeProvider, useThemeNeutralColor } from '../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

function PrsmPage() {
  const neutralColor = useThemeNeutralColor();

  return <GenericPage title="PRSM" color={neutralColor} />;
}

export default function PrsmRoute() {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <PrsmPage />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
