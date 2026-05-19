import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFeaturedTimelineEvent, fetchSiteActivityHistory, getCachedSiteActivityHistory } from '../lib/siteData';
import SystemPanel from './SystemPanel';

function ActivityFeedCard() {
  const [activity, setActivity] = useState(() => getCachedSiteActivityHistory(6) || []);
  const [status, setStatus] = useState(() => {
    const cachedActivity = getCachedSiteActivityHistory(6);
    if (!cachedActivity) return 'loading';
    return cachedActivity.length > 0 ? 'ready' : 'empty';
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadActivity() {
      if (!getCachedSiteActivityHistory(6)) {
        setStatus('loading');
      }

      try {
        const nextActivity = await fetchSiteActivityHistory(6);
        if (!isCancelled) {
          setActivity(nextActivity);
          setStatus(nextActivity.length > 0 ? 'ready' : 'empty');
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load site activity history:', error);
          setActivity([]);
          setStatus('error');
        }
      }
    }

    loadActivity();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <SystemPanel title="SITE HISTORY">
      <div className="terminal-activity-feed">
        {status === 'loading' ? (
          <p className="terminal-activity-feed__status">Pulling latest additions across LMNL.</p>
        ) : null}

        {status === 'error' ? (
          <p className="terminal-activity-feed__status">Site history is temporarily unavailable.</p>
        ) : null}

        {status === 'empty' ? (
          <p className="terminal-activity-feed__status">No site additions have been logged yet.</p>
        ) : null}

        {status === 'ready'
          ? activity.map((item) => {
            const content = (
              <>
                <div className="terminal-activity-feed__headline">
                  <span className="terminal-activity-feed__dot" style={{ '--activity-accent': item.accent }} />
                  <p className="terminal-activity-feed__title">{item.title}</p>
                  <span className="terminal-activity-feed__stamp">{item.stamp}</span>
                </div>
                <div className="terminal-activity-feed__meta">
                  <span className={item.isUpcoming ? 'terminal-activity-feed__badge' : undefined}>
                    {item.isUpcoming ? 'Upcoming event' : item.meta}
                  </span>
                  <span>{item.timeAgo}</span>
                </div>
              </>
            );

            const isExternal = item.href?.startsWith('http');
            const itemClassName = `terminal-activity-feed__item${item.href ? ' terminal-activity-feed__item--link' : ''}`;

            if (!item.href) {
              return (
                <article key={item.id} className={itemClassName}>
                  {content}
                </article>
              );
            }

            if (isExternal) {
              return (
                <a
                  key={item.id}
                  className={itemClassName}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={item.id}
                className={itemClassName}
                to={item.href}
              >
                {content}
              </Link>
            );
          })
          : null}
      </div>
    </SystemPanel>
  );
}

function InviteCard() {
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCancelled = false;

    async function loadFeaturedEvent() {
      try {
        const event = await fetchFeaturedTimelineEvent();
        if (isCancelled) return;
        setFeaturedEvent(event);
        setStatus(event ? 'ready' : 'empty');
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to load featured event for sidebar invite:', error);
        setFeaturedEvent(null);
        setStatus('error');
      }
    }

    loadFeaturedEvent();

    return () => {
      isCancelled = true;
    };
  }, []);

  const eventTitle = featuredEvent?.title || 'No featured event';
  const eventHref = featuredEvent?.link || (eventTitle === 'SPACE' || eventTitle === 'LMNL SPACE' ? '/space' : '/events');
  const eventLogoSrc = featuredEvent?.type === 'image' && typeof featuredEvent?.display === 'string' && featuredEvent.display
    ? featuredEvent.display
    : featuredEvent?.image_url || (eventTitle === 'SPACE' || eventTitle === 'LMNL SPACE' ? '/space-logo.png' : '/circle.svg');
  const eventLogoAlt = featuredEvent?.title ? `${featuredEvent.title} logo` : 'LMNL logo';
  const isExternal = eventHref.startsWith('http');

  const button =
    status === 'ready'
      ? (
        isExternal ? (
          <a href={eventHref} target="_blank" rel="noreferrer" className="terminal-invite-card__button theme-button">
            view
          </a>
        ) : (
          <Link to={eventHref} className="terminal-invite-card__button theme-button">
            view
          </Link>
        )
      )
      : (
        <Link to="/events" className="terminal-invite-card__button theme-button">
          view
        </Link>
      );

  return (
    <SystemPanel title="INVITE">
      <div className="terminal-invite-card">
        <div className="terminal-invite-card__row">
          <div className="terminal-invite-card__actions">
            <img
              className="terminal-invite-card__logo"
              src={eventLogoSrc}
              alt={eventLogoAlt}
              loading="lazy"
            />
            {button}
          </div>
        </div>
      </div>
    </SystemPanel>
  );
}

export default function TerminalSidebarPanels() {
  return (
    <>
      <ActivityFeedCard />
      <InviteCard />
    </>
  );
}
