import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ContentPageShell, { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import { usePageColor } from '../hooks/usePageColor';
import { buildTextDescription, usePageSeo } from '../hooks/usePageSeo';
import { apiGet, apiPost } from '../lib/api';
import { formatEventDate, formatEventTime } from '../utils/eventDisplay';
import ShareholderMeetingEvent from './ShareholderMeetingEvent';
import './EventPage.css';

function EventMetadata({ event }) {
  const items = [
    ['Date', formatEventDate(event.date)],
    ['Time', formatEventTime(event.time)],
    ['Venue', event.venue || 'TBA'],
    ['Address', event.address || 'TBA'],
    ['All-In Ticket Price', event.displayPrice],
    ['Availability', event.availability],
  ];

  return (
    <dl className="public-event-metadata">
      {items.map(([label, value]) => (
        <div className="public-event-metadata__row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PoweredByLmnl({ showcase }) {
  return (
    <section className="powered-by-lmnl" aria-labelledby="powered-by-lmnl-title">
      <div className="powered-by-lmnl__intro">
        <p className="public-event-kicker">Event support</p>
        <h2 id="powered-by-lmnl-title">Powered by LMNL</h2>
        <p>
          LMNL helps selected events with art direction, production, tickets, and public event pages.
        </p>
      </div>

      {showcase.state === 'ready' ? (
        <div className="powered-by-lmnl__grid">
          {showcase.events.map((event) => (
            <article className="powered-by-lmnl__card" key={event.id}>
              {event.artworkUrl ? (
                <img src={event.artworkUrl} alt="" decoding="async" loading="lazy" />
              ) : null}
              <div>
                <p className="public-event-kicker">Supported event</p>
                <h3>{event.name}</h3>
                {event.organizerCredit ? <p>Organized by {event.organizerCredit}</p> : null}
                <Link className="theme-button" to={`/events/${event.slug}`}>View event</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <PageEmptyState>{showcase.message}</PageEmptyState>
      )}
    </section>
  );
}

export default function EventPage() {
  const { slug = '' } = useParams();
  const [page, setPage] = useState(null);
  const [state, setState] = useState('loading');
  const [checkoutState, setCheckoutState] = useState('idle');
  const purchaseIntentIdRef = useRef('');

  usePageColor('#004ffa');

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setState('loading');
      setPage(null);
      setCheckoutState('idle');

      try {
        const data = await apiGet(`/api/public-event?slug=${encodeURIComponent(slug)}`);
        if (!cancelled) {
          setPage(data);
          setState('ready');
        }
      } catch (error) {
        console.error('Failed to load public event page:', error);
        if (!cancelled) setState('not-found');
      }
    }

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const event = page?.event;
  const isShareholderMeeting = slug === 'shareholder-meeting';
  usePageSeo({
    title: event?.name || 'LMNL | EVENT',
    description: buildTextDescription(event?.description, 'See LMNL event details and current ticket availability.'),
    image: isShareholderMeeting
      ? '/seo/shareholder-meeting.png'
      : event?.artworkUrl || '/seo/events-seo.png',
    path: `/events/${slug}`,
    robots: state === 'not-found' ? 'noindex, nofollow' : 'index, follow',
  });

  async function startCheckout() {
    if (!event?.ticketAction.enabled || checkoutState === 'loading') return;

    setCheckoutState('loading');
    try {
      if (!purchaseIntentIdRef.current) {
        purchaseIntentIdRef.current = crypto.randomUUID();
      }
      const result = await apiPost(event.ticketAction.endpoint, {
        eventId: event.ticketAction.eventId,
        purchaseIntentId: purchaseIntentIdRef.current,
      });
      purchaseIntentIdRef.current = '';
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      console.error('Failed to start event checkout:', error);
      setCheckoutState('error');
    }
  }

  return (
    <ContentPageShell
      title={event?.name || 'EVENT'}
      color="#004ffa"
      introTitle={event?.name || 'EVENT'}
      introCopy={isShareholderMeeting
        ? ''
        : event?.organizerCredit ? `ORGANIZED BY ${event.organizerCredit}` : 'PUBLIC EVENT PAGE'}
      contentClassName="public-event-content page-stack"
    >
      {state === 'loading' ? <PageStatus>RETRIEVING EVENT...</PageStatus> : null}

      {state === 'not-found' ? (
        <section className="public-event-not-found page-panel">
          <p className="public-event-kicker">Event unavailable</p>
          <h1>This event page was not found.</h1>
          <p>The event does not exist, is private, or is not published.</p>
          <Link className="theme-button" to="/events">View all events</Link>
        </section>
      ) : null}

      {state === 'ready' && event ? (
        <>
          {isShareholderMeeting ? (
            <ShareholderMeetingEvent
              event={event}
              checkoutState={checkoutState}
              onCheckout={startCheckout}
            />
          ) : (
            <article className="public-event-hero">
            <div className="public-event-artwork page-panel">
              {event.artworkUrl ? (
                <img src={event.artworkUrl} alt={`${event.name} event artwork`} />
              ) : (
                <div className="public-event-artwork__empty" aria-hidden="true">{event.name}</div>
              )}
            </div>

            <div className="public-event-details page-panel">
              <div>
                <p className="public-event-kicker">Event details</p>
                <h1>{event.name}</h1>
                {event.organizerCredit ? <p className="public-event-credit">Organized by {event.organizerCredit}</p> : null}
              </div>

              {event.description ? <p className="public-event-description">{event.description}</p> : null}
              <EventMetadata event={event} />

              {event.lineup.length > 0 ? (
                <section className="public-event-lineup" aria-labelledby="public-event-lineup-title">
                  <p className="public-event-kicker" id="public-event-lineup-title">Lineup</p>
                  <ul>
                    {event.lineup.map((performer) => <li key={performer}>{performer}</li>)}
                  </ul>
                </section>
              ) : null}

              <div className="public-event-actions">
                <button
                  className="theme-button"
                  type="button"
                  onClick={startCheckout}
                  disabled={!event.ticketAction.enabled || checkoutState === 'loading'}
                >
                  {checkoutState === 'loading' ? 'Opening checkout...' : event.ticketAction.label}
                </button>
                <Link className="theme-button" to="/events">All events</Link>
              </div>
              {checkoutState === 'error' ? (
                <p className="public-event-error">Checkout is not available. Try again.</p>
              ) : null}
            </div>
            </article>
          )}

          {isShareholderMeeting ? null : <PoweredByLmnl showcase={page.showcase} />}
        </>
      ) : null}
    </ContentPageShell>
  );
}
