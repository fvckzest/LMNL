import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import {
  fetchCommunitySnapshot,
  fetchNotificationEvent,
  fetchOpenProducts,
  fetchSiteActivityHistory,
  fetchTimelineEvents,
  getEventLink,
} from '../lib/siteData';
import './Events.css';

const PRIMARY_ROUTES = [
  {
    id: 'events',
    label: 'Events',
    title: 'Program calendar and active live routes.',
    to: '/events',
    accent: '#004ffa',
  },
  {
    id: 'services',
    label: 'Services',
    title: 'Creative capabilities, inquiry flow, and build support.',
    to: '/services',
    accent: '#7b52d6',
  },
  {
    id: 'community',
    label: 'Community',
    title: 'Network directory, reach, and historical participation.',
    to: '/community',
    accent: '#ff5bb8',
  },
  {
    id: 'shop',
    label: 'Shop',
    title: 'Artifacts, preorders, and open release states.',
    to: '/shop',
    accent: '#ff0000',
  },
];

const SECONDARY_ROUTES = [
  {
    id: 'about',
    label: 'About',
    title: 'Mission brief and operating layers.',
    copy: 'Read the system-level overview behind LMNL.',
    to: '/about',
    accent: '#ff9300',
  },
  {
    id: 'blog',
    label: 'Blog',
    title: 'Transmissions, writing, and recent records.',
    copy: 'Open the archive of public notes and releases.',
    to: '/blog',
    accent: '#ffde00',
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Reach the team directly.',
    copy: 'Move from browsing into an active conversation.',
    to: '/contact',
    accent: '#90e937',
  },
];

function formatCount(value) {
  return String(value || 0).padStart(2, '0');
}

function getActiveHomeEvent(notificationEvent, nextEvent) {
  if (notificationEvent) {
    return {
      title: notificationEvent.name,
      date: notificationEvent.event_date,
      location: notificationEvent.location_name || 'LMNL Space, LA',
      price: notificationEvent.price,
      is_private: notificationEvent.is_private,
      is_home_notif: notificationEvent.metadata?.is_home_notif || false,
      rsvpLink: getEventLink(notificationEvent),
    };
  }

  if (nextEvent) {
    return {
      title: nextEvent.title,
      date: nextEvent.date,
      location: nextEvent.location || 'LMNL Space, LA',
      price: nextEvent.price,
      is_private: nextEvent.is_private,
      is_home_notif: nextEvent.is_home_notif || false,
      rsvpLink: nextEvent.link || '/events',
    };
  }

  return {
    title: 'Events remain the active live layer.',
    date: 'TBA',
    location: 'LMNL Space, LA',
    price: null,
    is_private: false,
    is_home_notif: false,
    rsvpLink: '/events',
  };
}

function getCommunitySummary(snapshot) {
  const credits = snapshot?.credits || [];
  const events = snapshot?.events || [];
  const uniqueNames = new Set();

  credits.forEach((credit) => {
    const name = credit.name?.trim();
    if (name) uniqueNames.add(name);
  });

  events.forEach((event) => {
    [event.metadata?.performers, event.metadata?.artists].forEach((group) => {
      if (!group) return;
      group
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((name) => uniqueNames.add(name));
    });
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const pastEvents = events.filter((event) => {
    if (!event.event_date) return false;
    const eventDate = new Date(`${event.event_date}T00:00:00`);
    return !Number.isNaN(eventDate.getTime()) && eventDate < now;
  });

  return {
    creators: uniqueNames.size,
    pastEvents: pastEvents.length,
  };
}

function RoutePreviewCard({ route }) {
  return (
    <article
      className="page-preview-card page-preview-card--interactive theme-accent-panel"
      style={{ '--preview-accent': route.accent }}
    >
      <div className="page-preview-card__header">
        <p className="page-preview-card__eyebrow">{route.label}</p>
        <h3 className="page-preview-card__title">{route.title}</h3>
      </div>

      <p className="page-preview-card__copy">{route.copy}</p>

      <div className="page-preview-list" aria-label={`${route.label} preview metrics`}>
        {route.details.map((detail) => (
          <div key={detail.label} className="page-preview-list__item">
            <span>{detail.label}</span>
            <span>{detail.value}</span>
          </div>
        ))}
      </div>

      <div className="page-preview-card__footer">
        <span className="page-preview-card__signal">{route.signal}</span>
        <Link to={route.to} className="theme-button">
          Open {route.label}
        </Link>
      </div>
    </article>
  );
}

function SecondaryRouteCard({ route }) {
  return (
    <article
      className="page-preview-card page-preview-card--compact"
      style={{ '--preview-accent': route.accent }}
    >
      <div className="page-preview-card__header">
        <p className="page-preview-card__eyebrow">{route.label}</p>
        <h3 className="page-preview-card__title">{route.title}</h3>
      </div>
      <p className="page-preview-card__copy">{route.copy}</p>
      <div className="page-preview-card__footer">
        <span className="page-preview-card__signal">Standby route</span>
        <Link to={route.to} className="theme-button theme-button--ghost">
          Enter
        </Link>
      </div>
    </article>
  );
}

export default function Home() {
  const neutralColor = useThemeNeutralColor();
  const [homeData, setHomeData] = useState({
    activity: [],
    community: null,
    events: [],
    notificationEvent: null,
    products: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      const [notificationResult, eventsResult, communityResult, productsResult, activityResult] =
        await Promise.allSettled([
          fetchNotificationEvent(),
          fetchTimelineEvents(),
          fetchCommunitySnapshot(),
          fetchOpenProducts(),
          fetchSiteActivityHistory(6),
        ]);

      if (!isMounted) return;

      setHomeData({
        notificationEvent: notificationResult.status === 'fulfilled' ? notificationResult.value : null,
        events: eventsResult.status === 'fulfilled' ? eventsResult.value : [],
        community: communityResult.status === 'fulfilled' ? communityResult.value : null,
        products: productsResult.status === 'fulfilled' ? productsResult.value : [],
        activity: activityResult.status === 'fulfilled' ? activityResult.value : [],
      });
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const communitySummary = useMemo(() => getCommunitySummary(homeData.community), [homeData.community]);
  const nextEvent = homeData.events[0] || null;
  const latestBlogActivity = homeData.activity.find((item) => item.type === 'BLOG') || null;
  const latestShopActivity = homeData.activity.find((item) => item.type === 'SHOP') || null;
  const activeHomeEvent = useMemo(
    () => getActiveHomeEvent(homeData.notificationEvent, nextEvent),
    [homeData.notificationEvent, nextEvent],
  );

  const primaryRoutePreviews = useMemo(() => {
    const preorderCount = homeData.products.filter((product) => product.goal_quantity > 0).length;
    const readyToShipCount = homeData.products.filter((product) => product.goal_quantity <= 0).length;

    return [
      {
        ...PRIMARY_ROUTES[0],
        copy: nextEvent?.description || 'Browse current programs, upcoming activations, and the full event log.',
        signal: homeData.notificationEvent ? 'Live signal detected' : 'Calendar preview available',
        details: [
          { label: 'Upcoming', value: nextEvent?.title || 'No live title' },
          { label: 'Entries', value: formatCount(homeData.events.length) },
          { label: 'Route', value: nextEvent?.date || 'Standby' },
        ],
      },
      {
        ...PRIMARY_ROUTES[1],
        copy: 'Preview the core studio offerings before moving into the full services stack.',
        signal: 'Inquiry layer active',
        details: [
          { label: 'Capabilities', value: '04' },
          { label: 'Mode', value: 'Integrated' },
          { label: 'Entry', value: 'Open intake' },
        ],
      },
      {
        ...PRIMARY_ROUTES[2],
        copy: 'See the network scope at a glance before entering the full community layer.',
        signal: 'Directory live',
        details: [
          { label: 'Creators', value: formatCount(communitySummary.creators) },
          { label: 'Past events', value: formatCount(communitySummary.pastEvents) },
          { label: 'Reach', value: 'Expanding' },
        ],
      },
      {
        ...PRIMARY_ROUTES[3],
        copy: latestShopActivity?.title || 'Check open drops, artifacts, and product states.',
        signal: homeData.products.length > 0 ? 'Inventory preview loaded' : 'No open drop loaded',
        details: [
          { label: 'Open items', value: formatCount(homeData.products.length) },
          { label: 'Preorders', value: formatCount(preorderCount) },
          { label: 'Ready', value: formatCount(readyToShipCount) },
        ],
      },
    ];
  }, [communitySummary.creators, communitySummary.pastEvents, homeData.events.length, homeData.notificationEvent, homeData.products, latestShopActivity?.title, nextEvent?.date, nextEvent?.description, nextEvent?.title]);

  const systemSignals = [
    {
      id: 'live',
      label: homeData.notificationEvent?.name || 'No featured program is pinned right now.',
      meta: homeData.notificationEvent ? 'Live event route available' : 'Events route will resolve the current program.',
      color: '#004ffa',
    },
    {
      id: 'blog',
      label: latestBlogActivity?.title || 'Blog archive standing by for the next transmission.',
      meta: latestBlogActivity ? latestBlogActivity.stamp : 'Editorial route ready',
      color: '#ffde00',
    },
    {
      id: 'shop',
      label: latestShopActivity?.title || 'Shop route is ready for the next artifact drop.',
      meta: latestShopActivity ? latestShopActivity.stamp : 'Commerce route ready',
      color: '#ff0000',
    },
  ];

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
                <span>Start build</span>
              </Link>
            </div>
          </div>

          <div className="upcoming-event-section">
            <div className="upcoming-glow" />
            <div className="upcoming-content">
              <div className="upcoming-header-row">
                <div className="upcoming-header-copy">
                  <div className="upcoming-tag">UPCOMING EVENT</div>
                  <h2 className="upcoming-title">{activeHomeEvent.title}</h2>
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
                  <a href={activeHomeEvent.rsvpLink} className="upcoming-rsvp-btn">
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
        </div>
      </div>

      <SystemPanel title="SYSTEM SIGNALS">
        <div className="page-signal-list">
          {systemSignals.map((signal) => (
            <div key={signal.id} className="page-signal-list__item">
              <span className="page-signal-list__dot" style={{ backgroundColor: signal.color }} />
              <div className="page-signal-list__content">
                <span className="page-signal-list__label">{signal.label}</span>
                <span className="page-signal-list__meta">{signal.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </SystemPanel>

      <div className="page-preview-grid">
        {primaryRoutePreviews.map((route) => (
          <RoutePreviewCard key={route.id} route={route} />
        ))}
      </div>

      <SystemPanel title="EDITORIAL + SUPPORT">
        <div className="theme-panel-header">
          <h2 className="page-panel-title">Secondary routes stay in the terminal, just quieter.</h2>
          <p className="page-copy">
            About, blog, and contact remain browseable as support layers instead of getting buried beneath the primary modes.
          </p>
        </div>

        <div className="page-preview-grid page-preview-grid--compact">
          {SECONDARY_ROUTES.map((route) => (
            <SecondaryRouteCard key={route.id} route={route} />
          ))}
        </div>
      </SystemPanel>
    </ContentPageShell>
  );
}
