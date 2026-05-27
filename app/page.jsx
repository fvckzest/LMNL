import { headers } from 'next/headers';
import WebPageJsonLd from './_seo/WebPageJsonLd';
import AdminRootRoute from './AdminRootRoute';
import HomeRoute from './home/HomeRoute';

const publicDescription = 'LMNL is a Tacoma, Washington art and culture platform producing events, creative services, media, design systems, and community experiences.';
const adminDescription = 'Private LMNL admin interface.';

function readHostname(host = '') {
  if (host.startsWith('[')) {
    const bracketEnd = host.indexOf(']');
    return bracketEnd === -1 ? host : host.slice(0, bracketEnd + 1);
  }

  return host.split(':')[0];
}

function shouldShowAdminRoot(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || hostname.startsWith('admin.');
}

export async function generateMetadata() {
  const requestHeaders = await headers();
  const hostname = readHostname(requestHeaders.get('host'));

  if (shouldShowAdminRoot(hostname)) {
    return {
      title: 'LMNL | ADMIN',
      description: adminDescription,
      robots: {
        index: false,
        follow: false,
      },
      alternates: { canonical: 'https://admin.lmnl.art/' },
      openGraph: {
        title: 'LMNL | ADMIN',
        description: adminDescription,
        url: 'https://admin.lmnl.art/',
        siteName: 'LMNL',
        images: ['/seo/home-seo.png'],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'LMNL | ADMIN',
        description: adminDescription,
        images: ['/seo/home-seo.png'],
      },
    };
  }

  return {
    title: 'LMNL',
    description: publicDescription,
    robots: {
      index: true,
      follow: true,
    },
    alternates: { canonical: 'https://lmnl.art/' },
    openGraph: {
      title: 'LMNL',
      description: publicDescription,
      url: 'https://lmnl.art/',
      siteName: 'LMNL',
      images: ['/seo/home-seo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LMNL',
      description: publicDescription,
      images: ['/seo/home-seo.png'],
    },
  };
}

export default async function Page() {
  const requestHeaders = await headers();
  const hostname = readHostname(requestHeaders.get('host'));

  if (shouldShowAdminRoot(hostname)) {
    return <AdminRootRoute />;
  }

  return (
    <>
      <WebPageJsonLd path="" />
      <HomeRoute />
    </>
  );
}
