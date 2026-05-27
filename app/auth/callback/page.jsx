import WebPageJsonLd from '../../_seo/WebPageJsonLd';
import AuthCallbackRoute from './AuthCallbackRoute';

export const metadata = {
  title: 'LMNL | AUTH',
  description: 'Authentication callback for LMNL account access.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://lmnl.art/auth/callback',
  },
  openGraph: {
    title: 'LMNL | AUTH',
    description: 'Authentication callback for LMNL account access.',
    url: 'https://lmnl.art/auth/callback',
    siteName: 'LMNL',
    images: ['/seo/home-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | AUTH',
    description: 'Authentication callback for LMNL account access.',
    images: ['/seo/home-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <WebPageJsonLd path="auth/callback" />
      <AuthCallbackRoute searchParams={resolvedSearchParams} />
    </>
  );
}
