import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import EmailLabRoute from './EmailLabRoute';

function readHostname(host = '') {
  const value = String(host || '').trim().toLowerCase();

  if (value.startsWith('[')) {
    return value.slice(0, value.indexOf(']') + 1);
  }

  return value.split(':')[0];
}

function shouldShowEmailLab(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]';
}

export const metadata = {
  title: 'LMNL | EMAIL LAB',
  description: 'Local-only LMNL email preview lab.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://lmnl.art/email-lab' },
};

export default async function Page() {
  const requestHeaders = await headers();
  const hostname = readHostname(requestHeaders.get('host'));

  if (!shouldShowEmailLab(hostname)) {
    redirect('/');
  }

  return <EmailLabRoute />;
}
