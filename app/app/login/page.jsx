import WebPageJsonLd from '../../_seo/WebPageJsonLd';
import AppLoginRoute from './AppLoginRoute';

export const metadata = {
  title: 'LMNL | APP LOGIN',
  description: 'Sign in to the LMNL community app.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://lmnl.art/app/login',
  },
  openGraph: {
    title: 'LMNL | APP LOGIN',
    description: 'Sign in to the LMNL community app.',
    url: 'https://lmnl.art/app/login',
    siteName: 'LMNL',
    images: ['/seo/community-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | APP LOGIN',
    description: 'Sign in to the LMNL community app.',
    images: ['/seo/community-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <WebPageJsonLd path="app/login" />
      <AppLoginRoute searchParams={resolvedSearchParams} />
    </>
  );
}
