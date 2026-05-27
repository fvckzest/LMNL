import WebPageJsonLd from '../../_seo/WebPageJsonLd';
import ArtistInterestRoute from './ArtistInterestRoute';

export const metadata = {
  title: 'LMNL | COMMUNITY SHARE',
  description: 'Share your work with the LMNL community.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/community/share',
  },
  openGraph: {
    title: 'LMNL | COMMUNITY SHARE',
    description: 'Share your work with the LMNL community.',
    url: 'https://lmnl.art/community/share',
    siteName: 'LMNL',
    images: ['/seo/community-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | COMMUNITY SHARE',
    description: 'Share your work with the LMNL community.',
    images: ['/seo/community-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="community/share" />
      <ArtistInterestRoute />
    </>
  );
}
