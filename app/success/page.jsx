import WebPageJsonLd from '../_seo/WebPageJsonLd';
import SuccessRoute from './SuccessRoute';

export const metadata = {
  title: 'LMNL | ORDER CONFIRMATION',
  description: 'Order confirmation and ticket delivery status.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://lmnl.art/success',
  },
  openGraph: {
    title: 'LMNL | ORDER CONFIRMATION',
    description: 'Order confirmation and ticket delivery status.',
    url: 'https://lmnl.art/success',
    siteName: 'LMNL',
    images: ['/seo/events-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | ORDER CONFIRMATION',
    description: 'Order confirmation and ticket delivery status.',
    images: ['/seo/events-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <WebPageJsonLd path="success" />
      <SuccessRoute searchParams={resolvedSearchParams} />
    </>
  );
}
