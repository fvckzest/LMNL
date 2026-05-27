import BlogPostRoute from './BlogPostRoute';

const BLOG_POST_TITLE = 'LMNL | BLOG';
const BLOG_POST_DESCRIPTION = 'Read LMNL updates, essays, announcements, and stories.';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const path = `/blog/${encodeURIComponent(slug || '')}`;

  return {
    title: BLOG_POST_TITLE,
    description: BLOG_POST_DESCRIPTION,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `https://lmnl.art${path}`,
    },
    openGraph: {
      title: BLOG_POST_TITLE,
      description: BLOG_POST_DESCRIPTION,
      url: `https://lmnl.art${path}`,
      siteName: 'LMNL',
      images: ['/seo/blog-seo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: BLOG_POST_TITLE,
      description: BLOG_POST_DESCRIPTION,
      images: ['/seo/blog-seo.png'],
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;

  return <BlogPostRoute slug={slug} />;
}
