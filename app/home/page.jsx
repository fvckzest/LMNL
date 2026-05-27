import WebPageJsonLd from '../_seo/WebPageJsonLd';
import HomeRoute from './HomeRoute';

export const metadata = {
  title: 'LMNL',
  description: 'LMNL is a Tacoma, Washington art and culture platform producing events, creative services, media, design systems, and community experiences.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://lmnl.art/',
  },
  openGraph: {
    title: 'LMNL',
    description: 'LMNL is a Tacoma, Washington art and culture platform producing events, creative services, media, design systems, and community experiences.',
    url: 'https://lmnl.art/',
    siteName: 'LMNL',
    images: ['/seo/home-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL',
    description: 'LMNL is a Tacoma, Washington art and culture platform producing events, creative services, media, design systems, and community experiences.',
    images: ['/seo/home-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="home" />
      <HomeRoute />
    </>
  );
}
