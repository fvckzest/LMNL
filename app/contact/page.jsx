import WebPageJsonLd from '../_seo/WebPageJsonLd';
import ContactRoute from './ContactRoute';

export const metadata = {
  title: 'LMNL | CONTACT',
  description: 'Get in touch with LMNL for collaborations, services, and general inquiries.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://lmnl.art/contact',
  },
  openGraph: {
    title: 'LMNL | CONTACT',
    description: 'Get in touch with LMNL for collaborations, services, and general inquiries.',
    url: 'https://lmnl.art/contact',
    siteName: 'LMNL',
    images: ['/seo/contact-seo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LMNL | CONTACT',
    description: 'Get in touch with LMNL for collaborations, services, and general inquiries.',
    images: ['/seo/contact-seo.png'],
  },
};

export default function Page() {
  return (
    <>
      <WebPageJsonLd path="contact" />
      <ContactRoute />
    </>
  );
}
