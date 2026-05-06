import { useState, Fragment, useRef, useEffect } from 'react';
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
  const timelineRef = useRef(null);
  const timelineMetricsRef = useRef({ itemStep: 0, setWidth: 0 });
  const isRecenteringRef = useRef(false);

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

  const updateTimelineMetrics = () => {
    const el = timelineRef.current;
    if (!el || events.length === 0) return timelineMetricsRef.current;

    const nodes = el.querySelectorAll('.timeline-node-wrapper');
    if (nodes.length === 0) return timelineMetricsRef.current;

    const firstNode = nodes[0];
    const secondNode = nodes[1];
    const nextSetFirstNode = nodes[events.length];

    const itemStep = secondNode
      ? secondNode.offsetLeft - firstNode.offsetLeft
      : firstNode.getBoundingClientRect().width;
    const setWidth = nextSetFirstNode
      ? nextSetFirstNode.offsetLeft - firstNode.offsetLeft
      : el.scrollWidth / 3;

    timelineMetricsRef.current = { itemStep, setWidth };
    return timelineMetricsRef.current;
  };

  useEffect(() => {
    if (events.length > 0 && timelineRef.current) {
      const el = timelineRef.current;
      const timer = setTimeout(() => {
        const { setWidth } = updateTimelineMetrics();
        el.scrollLeft = setWidth || el.scrollWidth / 3;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [events]);

  useEffect(() => {
    if (events.length === 0) return undefined;

    const handleResize = () => {
      updateTimelineMetrics();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [events]);

  const handleScroll = () => {
    if (!timelineRef.current || isRecenteringRef.current) return;

    const el = timelineRef.current;
    const { itemStep, setWidth } = updateTimelineMetrics();
    if (!setWidth) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const threshold = Math.max(2, itemStep / 2);
    let nextScrollLeft = null;

    if (el.scrollLeft <= threshold) {
      nextScrollLeft = el.scrollLeft + setWidth;
    } else if (el.scrollLeft >= maxScrollLeft - threshold) {
      nextScrollLeft = el.scrollLeft - setWidth;
    }

    if (nextScrollLeft !== null) {
      isRecenteringRef.current = true;
      el.scrollLeft = nextScrollLeft;
      requestAnimationFrame(() => {
        isRecenteringRef.current = false;
      });
    }
  };

  const extendedEvents = events.length > 0 ? [...events, ...events, ...events] : [];

  const scrollTimeline = (direction) => {
    if (timelineRef.current) {
      const el = timelineRef.current;
      const { itemStep, setWidth } = updateTimelineMetrics();
      const scrollAmount = itemStep || 192;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;

      if (setWidth) {
        if (el.scrollLeft < setWidth) {
          el.scrollLeft += setWidth;
        } else if (el.scrollLeft > maxScrollLeft - setWidth) {
          el.scrollLeft -= setWidth;
        }
      }

      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <ContentPageShell
      title="EVENTS"
      color="#004ffa"
      introTitle="EVENTS"
      introCopy="PROGRAM LOGS, LIVE CALENDAR, AND CULTURAL DEPLOYMENTS"
      contentClassName="events-content page-stack"
    >
      <div className="events-layout">
          {/* Upcoming Event Highlight */}
          <div className="upcoming-event-section">
            <div className="upcoming-glow" />
            <div className="upcoming-content">
              <div className="upcoming-tag">UPCOMING EVENT</div>
              <h2 className="upcoming-title">{featuredEvent.title}</h2>
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
              <p className="upcoming-description">{featuredEvent.description}</p>
              {featuredEvent.is_home_notif ? (
                <a href={featuredEvent.rsvpLink} className="upcoming-rsvp-btn">
                  VIEW EVENT
                </a>
              ) : (
                <div className="upcoming-rsvp-btn upcoming-rsvp-btn--disabled">
                  COMING SOON
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <PageStatus>RETRIEVING TIMELINE...</PageStatus>
          ) : events.length === 0 ? (
            <PageEmptyState>NO EVENTS FOUND.</PageEmptyState>
          ) : (
            <>
            <h2 className="timeline-section-title">ALL EVENTS</h2>
            <div className="timeline-wrapper">
              <button className="timeline-arrow left" onClick={() => scrollTimeline('left')} aria-label="Scroll Left">
                &larr;
              </button>
              <div className="events-timeline-container" ref={timelineRef} onScroll={handleScroll}>
                <div className="events-timeline-horizontal">
                  {extendedEvents.map((event, index) => (
                    <Fragment key={`${event.id}-${index}`}>
                      <div className="timeline-node-wrapper">
                        <button 
                          className={`timeline-node ${selectedId === event.id ? 'active' : ''}`}
                          onClick={() => setSelectedId(event.id)}
                          aria-label={`Select ${event.title}`}
                        >
                          {event.type === 'text' ? (
                            <h2 className="events-space-title">{event.display}</h2>
                          ) : (
                            <img
                              src={event.display}
                              alt={event.title}
                              className="events-img"
                              decoding="async"
                              loading="lazy"
                            />
                          )}
                        </button>
                      </div>
                      {index < extendedEvents.length - 1 && (
                        <div className="timeline-inter-node" />
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
              <button className="timeline-arrow right" onClick={() => scrollTimeline('right')} aria-label="Scroll Right">
                &rarr;
              </button>
            </div>

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
            </>
            )}
      </div>
    </ContentPageShell>
  );
}
