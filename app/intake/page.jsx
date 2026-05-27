import WebPageJsonLd from '../_seo/WebPageJsonLd';
import IntakeRoute from './IntakeRoute';

export const metadata = {
  title: 'LMNL | WEBSITE INTAKE',
  description: 'Submit a website project intake for LMNL.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://lmnl.art/intake',
  },
  openGraph: {
    title: 'LMNL | WEBSITE INTAKE',
    description: 'Submit a website project intake for LMNL.',
    url: 'https://lmnl.art/intake',
    siteName: 'LMNL',
    images: ['/seo/services-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | WEBSITE INTAKE',
    description: 'Submit a website project intake for LMNL.',
    images: ['/seo/services-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="intake" />
      <IntakeRoute />
    </>
  );
}
