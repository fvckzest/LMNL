import TicketRoute from './TicketRoute';

const ticketTitle = 'LMNL | TICKET';
const ticketDescription = 'Secure LMNL event ticket access.';

export async function generateMetadata({ params }) {
  const { ticketId } = await params;
  const canonicalPath = `/ticket/${ticketId || ''}`;

  return {
    title: ticketTitle,
    description: ticketDescription,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `https://lmnl.art${canonicalPath}`,
    },
    openGraph: {
      title: ticketTitle,
      description: ticketDescription,
      url: `https://lmnl.art${canonicalPath}`,
      siteName: 'LMNL',
      images: ['/seo/events-seo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: ticketTitle,
      description: ticketDescription,
      images: ['/seo/events-seo.png'],
    },
  };
}

export default async function Page({ params }) {
  const { ticketId } = await params;

  return <TicketRoute ticketId={ticketId} />;
}
