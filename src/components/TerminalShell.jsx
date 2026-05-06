import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePageColor } from '../hooks/usePageColor';
import { fetchSiteActivityHistory } from '../lib/siteData';
import { getThemeNeutralColor, useTheme } from './ThemeProvider';
import LmnlLogoBlack from './LmnlLogoBlack';
import SystemPanel from './SystemPanel';
import './TerminalShell.css';

const MOBILE_SHELL_BREAKPOINT = '(max-width: 980px)';

const NAV_ITEMS = [
  { label: 'EVENTS', index: '01', to: '/events', color: '#004ffa' },
  { label: 'SERVICES', index: '02', to: '/services', color: '#6222d8' },
  { label: 'COMMUNITY', index: '03', to: '/community', color: '#ff5bb8' },
  { label: 'SHOP', index: '04', to: '/shop', color: '#ff0000' },
  { label: 'ABOUT', index: '05', to: '/about', color: '#ff9300' },
  { label: 'BLOG', index: '06', to: '/blog', color: '#ffde00' },
  { label: 'CONTACT', index: '07', to: '/contact', color: '#90e937' },
];

function formatSessionUptime(seconds) {
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
}

function formatSystemTime(date) {
  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).toUpperCase(),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };
}

function SidebarToggleIcon({ direction, collapsed }) {
  if (direction === 'left' && collapsed) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="5" y1="7" x2="19" y2="7" />
        <line x1="5" y1="12" x2="19" y2="12" />
        <line x1="5" y1="17" x2="19" y2="17" />
      </svg>
    );
  }

  const points = {
    left: collapsed ? '9 6 15 12 9 18' : '15 6 9 12 15 18',
    right: collapsed ? '15 6 9 12 15 18' : '9 6 15 12 9 18',
  };

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points={points[direction]} />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function ActivityFeedCard() {
  const [activity, setActivity] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCancelled = false;

    async function loadActivity() {
      setStatus('loading');

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
                <div className="terminal-activity-feed__row-topline">
                  <span className="terminal-activity-feed__type" style={{ '--activity-accent': item.accent }}>
                    {item.type}
                  </span>
                  <span className="terminal-activity-feed__stamp">{item.stamp}</span>
                </div>
                <p className="terminal-activity-feed__title">{item.title}</p>
                <div className="terminal-activity-feed__meta">
                  <span>{item.meta}</span>
                  <span>{item.timeAgo}</span>
                </div>
              </>
            );

            const isExternal = item.href?.startsWith('http');

            if (!item.href) {
              return (
                <article key={item.id} className="terminal-activity-feed__item">
                  {content}
                </article>
              );
            }

            if (isExternal) {
              return (
                <a
                  key={item.id}
                  className="terminal-activity-feed__item terminal-activity-feed__item--link"
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
                className="terminal-activity-feed__item terminal-activity-feed__item--link"
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

function DefaultRightSidebar({ title, color, activeLabel }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { date, time } = formatSystemTime(now);
  const overview = [
    { label: 'EVENTS', value: '12' },
    { label: 'COMMUNITY', value: '084' },
    { label: 'ARTIFACTS', value: '019' },
    { label: 'TRANSMISSIONS', value: '031' },
  ];
  const transmissions = [
    { title: activeLabel, type: 'NODE', date },
    { title: `${title} INDEX`, type: 'ARCHIVE', date: 'MAY 04' },
    { title: 'FIELD NOTES', type: 'LOG', date: 'APR 28' },
  ];

  return (
    <>
      <SystemPanel title="SYSTEM OVERVIEW">
        <div className="terminal-metric-list">
          {overview.map((item) => (
            <div key={item.label} className="terminal-metric-row">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </SystemPanel>

      <SystemPanel title="LATEST TRANSMISSIONS">
        <div className="terminal-log-table">
          <div className="terminal-log-table__head">
            <span />
            <span>TITLE</span>
            <span>TYPE</span>
            <span>DATE</span>
          </div>
          {transmissions.map((item) => (
            <div key={`${item.title}-${item.type}`} className="terminal-log-table__row">
              <span className="terminal-log-table__dot" style={{ backgroundColor: color }} />
              <span>{item.title}</span>
              <span>{item.type}</span>
              <span>{item.date}</span>
            </div>
          ))}
        </div>
      </SystemPanel>

      <SystemPanel title="SYSTEM TIME">
        <div className="terminal-time-block">
          <span>{time}</span>
          <span>{date}</span>
        </div>
      </SystemPanel>

      <SystemPanel title="NEW SIGNALS">
        <div className="terminal-signal-list">
          <span>ACTIVE NODE // {activeLabel}</span>
          <span>ACCENT CHANNEL // {color.toUpperCase()}</span>
        </div>
      </SystemPanel>

      <SystemPanel title="SYSTEM NOTICE">
        <div className="terminal-notice-graph" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </SystemPanel>
    </>
  );
}

export default function TerminalShell({
  title,
  color,
  introTitle,
  introCopy,
  rightSidebar,
  children,
  contentClassName = '',
}) {
  const location = useLocation();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const neutralColor = getThemeNeutralColor(theme);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_SHELL_BREAKPOINT).matches;
  });
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia(MOBILE_SHELL_BREAKPOINT).matches;
  });
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia(MOBILE_SHELL_BREAKPOINT).matches;
  });

  usePageColor(color);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(MOBILE_SHELL_BREAKPOINT);
    const syncSidebarState = (matchesMobile) => {
      setIsMobileViewport(matchesMobile);
      setLeftSidebarOpen(!matchesMobile);
      setRightSidebarOpen(!matchesMobile);
    };

    syncSidebarState(mediaQuery.matches);

    const handleChange = (event) => {
      syncSidebarState(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const activeItem = useMemo(() => {
    const navItems = [...NAV_ITEMS, { label: 'PRSM', index: '08', to: '/prsm', color: neutralColor }];
    const exact = navItems.find((item) => location.pathname === item.to);
    if (exact) return exact;

    if (location.pathname === '/' || location.pathname === '/home') {
      return { label: 'SYSTEM', index: '00', to: '/', color };
    }

    const partial = navItems.find((item) => location.pathname.startsWith(item.to));
    return partial || { label: title, index: '--', to: location.pathname, color };
  }, [color, location.pathname, neutralColor, title]);

  const navItems = useMemo(
    () => [...NAV_ITEMS, { label: 'PRSM', index: '08', to: '/prsm', color: neutralColor }],
    [neutralColor],
  );

  return (
    <div
      className="terminal-shell theme-app-shell"
      data-left-open={leftSidebarOpen}
      data-right-open={rightSidebarOpen}
      data-mobile={isMobileViewport}
      data-overlay-active={isMobileViewport && (leftSidebarOpen || rightSidebarOpen)}
      style={{ '--page-color': color }}
    >
      <aside
        id="terminal-shell-left-sidebar"
        className="terminal-shell__left theme-app-shell__sidebar theme-app-shell__sidebar--nav"
        aria-hidden={!leftSidebarOpen}
      >
        <div className="terminal-shell__sidebar-toggle-row terminal-shell__sidebar-toggle-row--left">
          <button
            type="button"
            className="terminal-shell__sidebar-toggle"
            aria-expanded={leftSidebarOpen}
            aria-controls="terminal-shell-left-sidebar"
            aria-label="Collapse navigation sidebar"
            title="Collapse navigation sidebar"
            onClick={() => setLeftSidebarOpen(false)}
          >
            <SidebarToggleIcon direction="left" collapsed={false} />
          </button>
        </div>

        <Link to="/" className="terminal-brand">
          <LmnlLogoBlack className="terminal-brand__logo" />
        </Link>

        <nav className="terminal-nav" aria-label="Primary">
          <Link
            to="/"
            className={`terminal-nav__item ${location.pathname === '/' || location.pathname === '/home' ? 'is-active' : ''}`}
            style={{ '--nav-color': neutralColor }}
          >
            <span className="terminal-nav__main">
              <span className="terminal-nav__dot" aria-hidden="true" />
              <span className="terminal-nav__label">TERMINAL</span>
            </span>
            <span className="terminal-nav__index">00</span>
          </Link>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`terminal-nav__item ${isActive ? 'is-active' : ''}`}
                style={{ '--nav-color': item.color }}
              >
                <span className="terminal-nav__main">
                  <span className="terminal-nav__dot" aria-hidden="true" />
                  <span className="terminal-nav__label">{item.label}</span>
                </span>
                <span className="terminal-nav__index">{item.index}</span>
              </Link>
            );
          })}
        </nav>

        <div className="terminal-meta">
          <div className="terminal-meta__label">LMNL.ART</div>
          <div className="terminal-meta__row"><span>VERSION</span><span>3.1.0</span></div>
          <div className="terminal-meta__row"><span>STATUS</span><span>ONLINE</span></div>
          <div className="terminal-meta__row"><span>UPTIME</span><span>{formatSessionUptime(elapsedSeconds)}</span></div>
          <div className="terminal-meta__row"><span>NODE</span><span>LMNL HQ</span></div>
          <div className="terminal-meta__row"><span>REGION</span><span>GLOBAL</span></div>
          <p className="terminal-meta__note">
            A creative platform for events, artists, artifacts, and cultural systems.
          </p>
        </div>
      </aside>

      <main className="terminal-shell__center theme-app-shell__main">
        <header className="terminal-shell__topbar theme-app-shell__bar">
          <div className="terminal-shell__topbar-left">
            {!leftSidebarOpen ? (
              <button
                type="button"
                className="terminal-shell__sidebar-toggle"
                aria-expanded={false}
                aria-controls="terminal-shell-left-sidebar"
                aria-label="Open navigation sidebar"
                title="Open navigation sidebar"
                onClick={() => setLeftSidebarOpen(true)}
              >
                <SidebarToggleIcon direction="left" collapsed />
              </button>
            ) : null}
            <span>CULTURAL OPERATING SYSTEM</span>
          </div>
          <div className="terminal-shell__topbar-right">
            <button
              type="button"
              className="terminal-shell__theme-toggle"
              onClick={toggleTheme}
            >
              {theme === 'light' ? 'DARK MODE' : 'LIGHT MODE'}
            </button>
            <Link
              to="/app"
              className="terminal-shell__profile-link"
              aria-label="Open profile"
              title="Open profile"
            >
              <ProfileIcon />
            </Link>
            {!rightSidebarOpen ? (
              <button
                type="button"
                className="terminal-shell__sidebar-toggle"
                aria-expanded={false}
                aria-controls="terminal-shell-right-sidebar"
                aria-label="Open information sidebar"
                title="Open information sidebar"
                onClick={() => setRightSidebarOpen(true)}
              >
                <SidebarToggleIcon direction="right" collapsed />
              </button>
            ) : null}
          </div>
        </header>

        <section className="terminal-shell__intro theme-page-intro">
          <div className="terminal-shell__title-row">
            <span className="terminal-shell__title-dot" aria-hidden="true" />
            <h1 className="terminal-shell__title">{introTitle || title}</h1>
          </div>
          {introCopy ? <p className="terminal-shell__copy">{introCopy}</p> : null}
        </section>

        <div className={['terminal-shell__content', contentClassName].filter(Boolean).join(' ')}>
          {children}
        </div>

        <footer className="terminal-shell__footer">
          <div className="terminal-shell__footer-links">
            <a href="https://instagram.com" target="_blank" rel="noreferrer">INSTAGRAM</a>
            <a href="https://x.com" target="_blank" rel="noreferrer">X</a>
            <a href="https://discord.com" target="_blank" rel="noreferrer">DISCORD</a>
          </div>
          <Link to="/contact" className="terminal-shell__footer-cta">SIGNAL THE SYSTEM +</Link>
        </footer>
      </main>

      <aside
        id="terminal-shell-right-sidebar"
        className="terminal-shell__right theme-app-shell__sidebar theme-app-shell__sidebar--info"
        aria-hidden={!rightSidebarOpen}
      >
        <div className="terminal-shell__sidebar-toggle-row terminal-shell__sidebar-toggle-row--right">
          <button
            type="button"
            className="terminal-shell__sidebar-toggle"
            aria-expanded={rightSidebarOpen}
            aria-controls="terminal-shell-right-sidebar"
            aria-label="Collapse information sidebar"
            title="Collapse information sidebar"
            onClick={() => setRightSidebarOpen(false)}
          >
            <SidebarToggleIcon direction="right" collapsed={false} />
          </button>
        </div>

        <ActivityFeedCard />

        {rightSidebar || (
          <DefaultRightSidebar
            title={title}
            color={color}
            activeLabel={activeItem.label}
          />
        )}
      </aside>
    </div>
  );
}
