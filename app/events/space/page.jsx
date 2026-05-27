import WebPageJsonLd from '../../_seo/WebPageJsonLd';
import SpaceRoute from '../../space/SpaceRoute';

export const metadata = {
  title: 'LMNL | SPACE',
  description: 'Discover LMNL Space, upcoming gatherings, and creative activations.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/events/space',
  },
  openGraph: {
    title: 'LMNL | SPACE',
    description: 'Discover LMNL Space, upcoming gatherings, and creative activations.',
    url: 'https://lmnl.art/events/space',
    siteName: 'LMNL',
    images: ['/seo/space-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | SPACE',
    description: 'Discover LMNL Space, upcoming gatherings, and creative activations.',
    images: ['/seo/space-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="events/space" />
      <SpaceRoute />
    </>
  );
}
