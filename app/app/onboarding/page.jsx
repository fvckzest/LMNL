import WebPageJsonLd from '../../_seo/WebPageJsonLd';
import AppOnboardingRoute from './AppOnboardingRoute';

export const metadata = {
  title: 'LMNL | APP ONBOARDING',
  description: 'Set up your LMNL community profile.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://lmnl.art/app/onboarding' },
  openGraph: {
    title: 'LMNL | APP ONBOARDING',
    description: 'Set up your LMNL community profile.',
    url: 'https://lmnl.art/app/onboarding',
    siteName: 'LMNL',
    images: ['/seo/community-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | APP ONBOARDING',
    description: 'Set up your LMNL community profile.',
    images: ['/seo/community-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  return (
    <>
      <WebPageJsonLd path="app/onboarding" />
      <AppOnboardingRoute searchParams={resolvedSearchParams} />
    </>
  );
}
