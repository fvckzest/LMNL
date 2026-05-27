import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import WebPageJsonLd from '../_seo/WebPageJsonLd';
import LoginRoute from './LoginRoute';

function readHostname(host = '') {
  const value = String(host || '').trim().toLowerCase();

  if (value.startsWith('[')) {
    return value.slice(0, value.indexOf(']') + 1);
  }

  return value.split(':')[0];
}

function shouldShowAdminLogin(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || hostname.startsWith('admin.');
}

export const metadata = {
  title: 'LMNL | ADMIN LOGIN',
  description: 'Private LMNL admin interface.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://admin.lmnl.art/login' },
  openGraph: {
    title: 'LMNL | ADMIN LOGIN',
    description: 'Private LMNL admin interface.',
    url: 'https://admin.lmnl.art/login',
    siteName: 'LMNL',
    images: ['/seo/home-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | ADMIN LOGIN',
    description: 'Private LMNL admin interface.',
    images: ['/seo/home-seo.png'],
  },
};

export default async function Page({ searchParams }) {
  const requestHeaders = await headers();
  const hostname = readHostname(requestHeaders.get('host'));

  if (!shouldShowAdminLogin(hostname)) {
    redirect('/');
  }

  const resolvedSearchParams = await searchParams;
  return (
    <>
      <WebPageJsonLd path="login" />
      <LoginRoute searchParams={resolvedSearchParams} />
    </>
  );
}
