import WebPageJsonLd from '../_seo/WebPageJsonLd';
import PortfolioRoute from './PortfolioRoute';

export const metadata = {
  title: 'LMNL | PORTFOLIO',
  description: 'View selected LMNL creative work, visual experiments, and client projects.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/portfolio',
  },
  openGraph: {
    title: 'LMNL | PORTFOLIO',
    description: 'View selected LMNL creative work, visual experiments, and client projects.',
    url: 'https://lmnl.art/portfolio',
    siteName: 'LMNL',
    images: ['/seo/services-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | PORTFOLIO',
    description: 'View selected LMNL creative work, visual experiments, and client projects.',
    images: ['/seo/services-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <WebPageJsonLd path="portfolio" />
      <PortfolioRoute searchParams={resolvedSearchParams} />
    </>
  );
}
