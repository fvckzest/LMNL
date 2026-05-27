import DashboardRoute from './DashboardRoute';

export async function generateMetadata({ params }) {
  const { userSlug } = await params;
  const canonicalPath = `/dashboard/${encodeURIComponent(userSlug || '')}`;

  return {
    title: 'LMNL | COMMUNITY DASHBOARD',
    description: 'Access your LMNL community dashboard.',
    robots: { index: false, follow: false },
    alternates: { canonical: `https://lmnl.art${canonicalPath}` },
    openGraph: {
      title: 'LMNL | COMMUNITY DASHBOARD',
      description: 'Access your LMNL community dashboard.',
      url: `https://lmnl.art${canonicalPath}`,
      siteName: 'LMNL',
      images: ['/seo/community-seo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LMNL | COMMUNITY DASHBOARD',
      description: 'Access your LMNL community dashboard.',
      images: ['/seo/community-seo.png'],
    },
  };
}

export default async function Page({ params, searchParams }) {
  const [{ userSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return <DashboardRoute searchParams={resolvedSearchParams} userSlug={userSlug} />;
}
