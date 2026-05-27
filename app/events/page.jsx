import WebPageJsonLd from '../_seo/WebPageJsonLd';
import EventsRoute from './EventsRoute';

export const metadata = {
  title: 'LMNL | EVENTS',
  description: 'Browse upcoming LMNL programs, live experiences, and cultural events.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/events',
  },
  openGraph: {
    title: 'LMNL | EVENTS',
    description: 'Browse upcoming LMNL programs, live experiences, and cultural events.',
    url: 'https://lmnl.art/events',
    siteName: 'LMNL',
    images: ['/seo/events-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | EVENTS',
    description: 'Browse upcoming LMNL programs, live experiences, and cultural events.',
    images: ['/seo/events-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="events" />
      <EventsRoute />
    </>
  );
}
