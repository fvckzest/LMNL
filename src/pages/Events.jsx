import { useState, useEffect } from 'react';
import ContentPageShell, { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import { usePageColor } from '../hooks/usePageColor';
import { fallbackEventsTimeline, fetchTimelineEvents } from '../lib/siteData';
import './Events.css';

const upcomingEvent = {
  id: 'next-fest',
  title: 'LMNL FEST 2026',
  date: 'June 15, 2026',
  location: 'LMNL Space, LA',
  description: 'Our biggest gathering yet. A multi-day festival celebrating the intersection of art, technology, and community. Featuring live performances, interactive installations, and exclusive drops.',
  rsvpLink: '#rsvp',
  price: 2500,
  is_private: false
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [featuredEvent, setFeaturedEvent] = useState(upcomingEvent);
  const [loading, setLoading] = useState(true);

  usePageColor('#004ffa');

  useEffect(() => {
    async function fetchSupabaseEvents() {
      try {
        const mapped = await fetchTimelineEvents();
        setEvents(mapped);
        setSelectedId(mapped[0].id);

        const feat = mapped.find((event) => event.is_featured);
        if (feat) {
          setFeaturedEvent({
            id: feat.id,
            title: feat.title,
            date: feat.date,
            location: feat.location,
            description: feat.description,
            rsvpLink: feat.link || '#rsvp',
            price: feat.price,
            is_private: feat.is_private,
            is_home_notif: feat.is_home_notif
          });
        }
      } catch (error) {
        console.error('Failed to load events timeline:', error);
        setEvents(fallbackEventsTimeline);
        setSelectedId(fallbackEventsTimeline[0].id);
      } finally {
        setLoading(false);
      }
    }
    fetchSupabaseEvents();
  }, []);

  const selectedEvent = events.find(e => e.id === selectedId);
  const featuredEventAction = featuredEvent.is_home_notif ? (
    <a href={featuredEvent.rsvpLink} className="upcoming-rsvp-btn">
      VIEW EVENT
    </a>
  ) : (
    <div className="upcoming-rsvp-btn upcoming-rsvp-btn--disabled">
      COMING SOON
    </div>
  );

  return (
    <ContentPageShell
      title="EVENTS"
      color="#004ffa"
      introTitle="EVENTS"
      introCopy="PROGRAM LOGS, LIVE CALENDAR, AND CULTURAL DEPLOYMENTS"
      contentClassName="events-content page-stack"
    >
      <div className="events-layout">
        {loading ? (
          <PageStatus>RETRIEVING EVENTS...</PageStatus>
        ) : events.length === 0 ? (
          <PageEmptyState>NO EVENTS FOUND.</PageEmptyState>
        ) : (
          <>
          <div className="upcoming-event-section">
            <div className="upcoming-glow" />
            <div className="upcoming-content">
              <div className="upcoming-header-row">
                <div className="upcoming-header-copy">
                  <div className="upcoming-tag">UPCOMING EVENT</div>
                  <div className="upcoming-title-row">
                    <h2 className="upcoming-title">{featuredEvent.title}</h2>
                    <div className="upcoming-rsvp-mobile">
                      {featuredEventAction}
                    </div>
                  </div>
                  <div className="upcoming-meta">
                    <span className="upcoming-date">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {featuredEvent.date}
                    </span>
                    <span className="upcoming-location">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {featuredEvent.location}
                    </span>
                  </div>
                </div>
                <div className="upcoming-rsvp-desktop">
                  {featuredEventAction}
                </div>
              </div>
              <div className="upcoming-meta upcoming-meta--secondary">
                <span className="upcoming-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  {featuredEvent.price === 0 || !featuredEvent.price ? 'FREE' : `$${(featuredEvent.price / 100).toFixed(2)}`}
                </span>
                <span className="upcoming-location">
                  {featuredEvent.is_private ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      PRIVATE (REQUEST ONLY)
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      PUBLIC
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="events-detail-grid">
            <section className="events-table-panel" aria-label="All events">
              <div className="events-table-header">
                <h2 className="timeline-section-title">ALL EVENTS</h2>
                <span className="events-table-count">{events.length} LOGS</span>
              </div>
              <div className="events-table-shell">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Location</th>
                      <th scope="col" className="events-table-date-heading">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className={selectedId === event.id ? 'active' : ''}
                        onClick={() => setSelectedId(event.id)}
                      >
                        <td>
                          <button
                            type="button"
                            className="events-table-row-button"
                            onClick={() => setSelectedId(event.id)}
                            aria-pressed={selectedId === event.id}
                          >
                            <span className="events-table-title">{event.title}</span>
                          </button>
                        </td>
                        <td>{event.location || 'LMNL Space, LA'}</td>
                        <td className="events-table-date-cell">{event.date || 'TBA'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedEvent && (
              <div className="event-detail-card">
                <div className="card-glow" />
                <div className="card-content">
                  <div className="card-header">
                    <h2 className="card-title">{selectedEvent.title}</h2>
                    <span className="card-date">{selectedEvent.date}</span>
                  </div>
                  <p className="card-description">{selectedEvent.description}</p>
                  
                  {selectedEvent.link && (
                    <a href={selectedEvent.link} className="card-action-btn">
                      Explore Space
                    </a>
                  )}

                  {selectedEvent.performers && (
                    <div className="card-lineup-section">
                      <h3 className="lineup-title">LINEUP</h3>
                      <div className="lineup-grid">
                        {selectedEvent.performers.split(',').map((perf, idx) => (
                          <span key={idx} className="lineup-artist">{perf.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.artists && (
                    <div className="card-lineup-section card-artists-section">
                      <h3 className="lineup-title">FEATURED ARTISTS</h3>
                      <div className="lineup-grid">
                        {selectedEvent.artists.split(',').map((art, idx) => (
                          <span key={idx} className="lineup-artist artist-pill">{art.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent.media && selectedEvent.media.length > 0 && (
                    <div className="card-media-section">
                      <h3 className="media-section-title">Media Gallery</h3>
                      <div className="media-grid">
                        {selectedEvent.media.map((item, idx) => (
                          <div key={idx} className="media-item">
                            {item.type === 'image' ? (
                              <img
                                src={item.url}
                                alt={`Media ${idx}`}
                                className="media-img"
                                decoding="async"
                                loading="lazy"
                              />
                            ) : (
                              <video src={item.url} className="media-video" controls />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </ContentPageShell>
  );
}
