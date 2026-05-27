import WebPageJsonLd from '../_seo/WebPageJsonLd';
import PrsmRoute from './PrsmRoute';

export const metadata = {
  title: 'LMNL | PRSM',
  description: 'Explore PRSM by LMNL.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/prsm',
  },
  openGraph: {
    title: 'LMNL | PRSM',
    description: 'Explore PRSM by LMNL.',
    url: 'https://lmnl.art/prsm',
    siteName: 'LMNL',
    images: ['/seo/prsm-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | PRSM',
    description: 'Explore PRSM by LMNL.',
    images: ['/seo/prsm-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="prsm" />
      <PrsmRoute />
    </>
  );
}
