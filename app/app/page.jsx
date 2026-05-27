import WebPageJsonLd from '../_seo/WebPageJsonLd';
import AppRoute from './AppRoute';

export const metadata = {
  title: 'LMNL | APP',
  description: 'Access the LMNL community app and member tools.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://lmnl.art/app' },
  openGraph: {
    title: 'LMNL | APP',
    description: 'Access the LMNL community app and member tools.',
    url: 'https://lmnl.art/app',
    siteName: 'LMNL',
    images: ['/seo/community-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | APP',
    description: 'Access the LMNL community app and member tools.',
    images: ['/seo/community-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  return (
    <>
      <WebPageJsonLd path="app" />
      <AppRoute searchParams={resolvedSearchParams} />
    </>
  );
}
