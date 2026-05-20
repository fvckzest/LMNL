import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import EventTitleDisplay from '../components/EventTitleDisplay';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import {
  fetchNotificationEvent,
  fetchTimelineEvents,
  normalizeEventSummary,
} from '../lib/siteData';
import './Events.css';

function getActiveHomeEvent(notificationEvent, nextEvent) {
  if (notificationEvent) {
    return normalizeEventSummary(notificationEvent);
  }

  if (nextEvent) {
    return normalizeEventSummary(nextEvent);
  }

  return {
    title: 'LOADING',
    imageUrl: '',
    date: 'TBA',
    location: 'Tacoma WA',
    price: null,
    is_private: false,
    is_home_notif: false,
    rsvpLink: '/events',
  };
}

export default function Home() {
  const neutralColor = useThemeNeutralColor();
  const [homeData, setHomeData] = useState({
    events: [],
    notificationEvent: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      const [notificationResult, eventsResult] =
        await Promise.allSettled([
          fetchNotificationEvent(),
          fetchTimelineEvents(),
        ]);

      if (!isMounted) return;

      setHomeData({
        notificationEvent: notificationResult.status === 'fulfilled' ? notificationResult.value : null,
        events: eventsResult.status === 'fulfilled' ? eventsResult.value : [],
      });
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const nextEvent = homeData.events[0] || null;
  const activeHomeEvent = useMemo(
    () => getActiveHomeEvent(homeData.notificationEvent, nextEvent),
    [homeData.notificationEvent, nextEvent],
  );

  return (
    <ContentPageShell
      title="TERMINAL"
      color={neutralColor}
      introTitle="TERMINAL"
      introCopy="Welcome to LMNL"
      contentClassName="page-stack"
    >
      <div className="page-hero-grid">
        <div className="page-hero-grid__main">
          <section className="home-company-box" aria-label="Company introduction">
            <h1 className="sr-only">LMNL</h1>
            <p className="home-company-box__copy">
              LMNL is a Tacoma-based art and culture platform building events, creative services, digital tools, and community experiences that bring people together.
            </p>
            <p className="home-company-box__copy">
              Visit one of our events, explore our services, and join our community.
            </p>
          </section>

          <div className="page-panel theme-accent-panel">
            <div className="page-command-strip" aria-label="Terminal shortcuts">
              <Link
                to="/events"
                className="page-command-strip__item"
                style={{ '--command-accent': '#004ffa' }}
              >
                <span>View programs</span>
              </Link>
              <Link
                to="/community"
                className="page-command-strip__item"
                style={{ '--command-accent': '#ff5bb8' }}
              >
                <span>Enter network</span>
              </Link>
              <Link
                to="/services"
                className="page-command-strip__item"
                style={{ '--command-accent': '#7b52d6' }}
              >
                <span>Explore Services</span>
              </Link>
              <Link
                to="/shop"
                className="page-command-strip__item"
                style={{ '--command-accent': '#ff0000' }}
              >
                <span>View artifacts</span>
              </Link>
            </div>
          </div>

          <div className="upcoming-event-section">
            <div className="upcoming-glow" />
            <div className="upcoming-content">
              <div className="upcoming-header-row">
                <div className="upcoming-header-copy">
                  <div className="upcoming-tag">UPCOMING EVENT</div>
                  <EventTitleDisplay
                    title={activeHomeEvent.title}
                    imageUrl={activeHomeEvent.imageUrl}
                    className="upcoming-title"
                    imageClassName="event-title-display__image--upcoming"
                  />
                  <div className="upcoming-meta">
                    <span className="upcoming-date">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {activeHomeEvent.date}
                    </span>
                    <span className="upcoming-location">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {activeHomeEvent.location}
                    </span>
                  </div>
                </div>
                {activeHomeEvent.is_home_notif ? (
                  <a
                    href={activeHomeEvent.rsvpLink}
                    className="upcoming-rsvp-btn upcoming-rsvp-btn--home-accent"
                  >
                    VIEW EVENT
                  </a>
                ) : (
                  <div className="upcoming-rsvp-btn upcoming-rsvp-btn--disabled">
                    COMING SOON
                  </div>
                )}
              </div>
              <div className="upcoming-meta upcoming-meta--secondary">
                <span className="upcoming-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  {activeHomeEvent.price === 0 || !activeHomeEvent.price ? 'FREE' : `$${(activeHomeEvent.price / 100).toFixed(2)}`}
                </span>
                <span className="upcoming-location">
                  {activeHomeEvent.is_private ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      PRIVATE
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
        </div>
      </div>
    </ContentPageShell>
  );
}
