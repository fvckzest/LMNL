import WebPageJsonLd from '../_seo/WebPageJsonLd';
import AboutRoute from './AboutRoute';

export const metadata = {
  title: 'LMNL | ABOUT',
  description: 'Learn about LMNL and the vision behind its art, events, and creative systems.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/about',
  },
  openGraph: {
    title: 'LMNL | ABOUT',
    description: 'Learn about LMNL and the vision behind its art, events, and creative systems.',
    url: 'https://lmnl.art/about',
    siteName: 'LMNL',
    images: ['/seo/about-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | ABOUT',
    description: 'Learn about LMNL and the vision behind its art, events, and creative systems.',
    images: ['/seo/about-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="about" />
      <AboutRoute />
    </>
  );
}
