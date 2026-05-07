import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePageColor } from '../hooks/usePageColor';
import { fetchSiteActivityHistory, getCachedSiteActivityHistory } from '../lib/siteData';
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

export default function TerminalShell({
  title,
  color,
  introLabel,
  introTitle,
  introCopy,
  metaNote = 'A creative platform for events, artists, artifacts, and cultural systems.',
  rightSidebar,
  rightSidebarFooter,
  children,
  contentClassName = '',
}) {
  const location = useLocation();
  const showProfileLink = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
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
          {metaNote ? <p className="terminal-meta__note">{metaNote}</p> : null}
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
            ) : <button
              type="button"
              className="terminal-shell__sidebar-toggle"
              aria-expanded={false}
              aria-controls="terminal-shell-left-sidebar"
              aria-label="Open navigation sidebar"
              title="Open navigation sidebar"
              onClick={() => setLeftSidebarOpen(false)}
            >
              <SidebarToggleIcon direction="left" collapsed />
            </button>
            }
            {!leftSidebarOpen ? (
              <img src="/circle.svg" alt="LMNL" width="50px" />
            ) : <img src="/circle.svg" alt="LMNL" width="50px" />}
          </div>
          <div className="terminal-shell__topbar-right">
            <button
              type="button"
              className="terminal-shell__theme-toggle"
              onClick={toggleTheme}
            >
              {theme === 'light' ? 'DARK MODE' : 'LIGHT MODE'}
            </button>
            {showProfileLink ? (
              <Link
                to="/app"
                className="terminal-shell__profile-link"
                aria-label="Open profile"
                title="Open profile"
              >
                <ProfileIcon />
              </Link>
            ) : null}
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
          {introLabel ? <p className="terminal-shell__eyebrow">{introLabel}</p> : null}
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


        {rightSidebar || <ActivityFeedCard />}
        {rightSidebarFooter ? <div className="terminal-shell__right-footer">{rightSidebarFooter}</div> : null}
      </aside>
    </div>
  );
}
