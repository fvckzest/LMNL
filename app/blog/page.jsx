import WebPageJsonLd from '../_seo/WebPageJsonLd';
import BlogRoute from './BlogRoute';

export const metadata = {
  title: 'LMNL | BLOG',
  description: 'Read LMNL updates, essays, announcements, and stories.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/blog',
  },
  openGraph: {
    title: 'LMNL | BLOG',
    description: 'Read LMNL updates, essays, announcements, and stories.',
    url: 'https://lmnl.art/blog',
    siteName: 'LMNL',
    images: ['/seo/blog-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | BLOG',
    description: 'Read LMNL updates, essays, announcements, and stories.',
    images: ['/seo/blog-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="blog" />
      <BlogRoute />
    </>
  );
}
