'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import BlogPostView from '../../../src/pages/BlogPostView';
import { RouterAdapterProvider } from '../../../src/components/RouterAdapter';
import { ThemeProvider } from '../../../src/components/ThemeProvider';

function NextRouterLink({ to, children, ...props }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export default function BlogPostRoute({ slug }) {
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <RouterAdapterProvider value={{ Link: NextRouterLink, pathname }}>
        <BlogPostView slug={slug} />
      </RouterAdapterProvider>
    </ThemeProvider>
  );
}
