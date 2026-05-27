import WebPageJsonLd from '../_seo/WebPageJsonLd';
import CommunityRoute from './CommunityRoute';

export const metadata = {
  title: 'LMNL | COMMUNITY',
  description: 'Join the LMNL community network and stay connected to future drops and events.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/community',
  },
  openGraph: {
    title: 'LMNL | COMMUNITY',
    description: 'Join the LMNL community network and stay connected to future drops and events.',
    url: 'https://lmnl.art/community',
    siteName: 'LMNL',
    images: ['/seo/community-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | COMMUNITY',
    description: 'Join the LMNL community network and stay connected to future drops and events.',
    images: ['/seo/community-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="community" />
      <CommunityRoute />
    </>
  );
}
