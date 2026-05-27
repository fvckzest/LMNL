import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import CheckInRoute from './CheckInRoute';

function readHostname(host = '') {
  if (host.startsWith('[')) {
    const bracketEnd = host.indexOf(']');
    return bracketEnd === -1 ? host : host.slice(0, bracketEnd + 1);
  }

  return host.split(':')[0];
}

function shouldShowAdminCheckIn(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || hostname.startsWith('admin.');
}

export async function generateMetadata({ params }) {
  const { token } = await params;
  const canonicalPath = `/check-in/${encodeURIComponent(token || '')}`;

  return {
    title: 'LMNL | CHECK-IN',
    description: 'Private LMNL check-in interface.',
    robots: {
      index: false,
      follow: false,
    },
    alternates: { canonical: `https://admin.lmnl.art${canonicalPath}` },
    openGraph: {
      title: 'LMNL | CHECK-IN',
      description: 'Private LMNL check-in interface.',
      url: `https://admin.lmnl.art${canonicalPath}`,
      siteName: 'LMNL',
      images: ['/seo/events-seo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LMNL | CHECK-IN',
      description: 'Private LMNL check-in interface.',
      images: ['/seo/events-seo.png'],
    },
  };
}

export default async function Page({ params }) {
  const requestHeaders = await headers();
  const hostname = readHostname(requestHeaders.get('host'));

  if (!shouldShowAdminCheckIn(hostname)) {
    redirect('/');
  }

  const { token } = await params;
  return <CheckInRoute token={token} />;
}
