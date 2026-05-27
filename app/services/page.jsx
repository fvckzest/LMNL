import WebPageJsonLd from '../_seo/WebPageJsonLd';
import ServicesRoute from './ServicesRoute';

export const metadata = {
  title: 'LMNL | SERVICES',
  description: 'See LMNL creative services, consulting, production, and digital systems work.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/services',
  },
  openGraph: {
    title: 'LMNL | SERVICES',
    description: 'See LMNL creative services, consulting, production, and digital systems work.',
    url: 'https://lmnl.art/services',
    siteName: 'LMNL',
    images: ['/seo/services-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | SERVICES',
    description: 'See LMNL creative services, consulting, production, and digital systems work.',
    images: ['/seo/services-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="services" />
      <ServicesRoute />
    </>
  );
}
