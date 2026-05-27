import WebPageJsonLd from '../_seo/WebPageJsonLd';
import ShopRoute from './ShopRoute';

export const metadata = {
  title: 'LMNL | SHOP',
  description: 'Browse LMNL products, editions, and artifacts.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/shop',
  },
  openGraph: {
    title: 'LMNL | SHOP',
    description: 'Browse LMNL products, editions, and artifacts.',
    url: 'https://lmnl.art/shop',
    siteName: 'LMNL',
    images: ['/seo/shop-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | SHOP',
    description: 'Browse LMNL products, editions, and artifacts.',
    images: ['/seo/shop-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <WebPageJsonLd path="shop" />
      <ShopRoute searchParams={resolvedSearchParams} />
    </>
  );
}
