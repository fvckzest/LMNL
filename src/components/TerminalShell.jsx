import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePageColor } from '../hooks/usePageColor';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { AppLink, useAppLocation } from './RouterAdapter';
import { getThemeNeutralColor, useTheme } from './ThemeProvider';
import LmnlLogoBlack from './LmnlLogoBlack';
import SocialLinks from './SocialLinks';

const MOBILE_SHELL_BREAKPOINT = '(max-width: 980px)';
const TerminalSidebarPanels = lazyWithRetry(() => import('./TerminalSidebarPanels'));

function readMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_SHELL_BREAKPOINT).matches || window.innerWidth <= 980;
}

function subscribeMobileViewport(callback) {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia(MOBILE_SHELL_BREAKPOINT);
  mediaQuery.addEventListener('change', callback);
  window.addEventListener('resize', callback);

  return () => {
    mediaQuery.removeEventListener('change', callback);
    window.removeEventListener('resize', callback);
  };
}

function useMobileViewport() {
  return useSyncExternalStore(subscribeMobileViewport, readMobileViewport, () => false);
}

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

function SidebarToggleIcon({ direction, collapsed, size = 16 }) {
  if (direction === 'left' && collapsed) {
    return (
      <svg
        width="32"
        height="32"
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
      width={size}
      height={size}
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

export default function TerminalShell({
  title,
  color,
  introAccentColor,
  introLabel,
  introTitle,
  introCopy,
  introActions,
  metaNote = 'A creative platform for events, artists, artifacts, and cultural systems.',
  children,
  contentClassName = '',
}) {
  const location = useAppLocation();
  const showProfileLink = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const neutralColor = getThemeNeutralColor(theme);
  const isMobileViewport = useMobileViewport();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [sidebarDataReady, setSidebarDataReady] = useState(false);

  usePageColor(color);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const timeoutId = window.setTimeout(() => {
      setLeftSidebarOpen(!isMobileViewport);
      setRightSidebarOpen(!isMobileViewport);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isMobileViewport]);

  useEffect(() => {
    if (!rightSidebarOpen || sidebarDataReady || typeof window === 'undefined') {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let idleId = null;

    const markReady = () => {
      if (!cancelled) {
        setSidebarDataReady(true);
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(markReady, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(markReady, 900);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [rightSidebarOpen, sidebarDataReady]);

  const navItems = useMemo(
    () => [...NAV_ITEMS, { label: 'PRSM', index: '08', to: '/prsm', color: neutralColor }],
    [neutralColor],
  );

  const closeMobilePanels = () => {
    if (!isMobileViewport) return;
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  };

  const rightSidebarContent = sidebarDataReady ? (
    <Suspense fallback={null}>
      <TerminalSidebarPanels />
    </Suspense>
  ) : null;

  return (
    <div
      className="terminal-shell theme-app-shell"
      data-left-open={leftSidebarOpen}
      data-right-open={rightSidebarOpen}
      data-mobile={isMobileViewport}
      data-overlay-active={isMobileViewport && (leftSidebarOpen || rightSidebarOpen)}
      style={{
        '--page-color': color,
        '--terminal-intro-accent': introAccentColor || color,
      }}
    >
      {isMobileViewport && (leftSidebarOpen || rightSidebarOpen) ? (
        <button
          type="button"
          className="terminal-shell__mobile-overlay"
          aria-label="Close open panel"
          onClick={closeMobilePanels}
        />
      ) : null}
      <aside
        id="terminal-shell-left-sidebar"
        className="terminal-shell__left theme-app-shell__sidebar theme-app-shell__sidebar--nav"
        aria-hidden={!leftSidebarOpen}
      >
        {isMobileViewport && leftSidebarOpen ? (
          <div className="terminal-shell__sidebar-toggle-row terminal-shell__sidebar-toggle-row--left">
            <button
              type="button"
              className="terminal-shell__sidebar-toggle terminal-shell__sidebar-toggle--in-panel"
              aria-expanded={true}
              aria-controls="terminal-shell-left-sidebar"
              aria-label="Close navigation sidebar"
              title="Close navigation sidebar"
              onClick={() => setLeftSidebarOpen(false)}
            >
              <SidebarToggleIcon direction="left" collapsed size={32} />
            </button>
          </div>
        ) : null}

        <AppLink to="/" className="terminal-brand">
          <LmnlLogoBlack className="terminal-brand__logo" />
        </AppLink>

        <nav className="terminal-nav" aria-label="Primary">
          <AppLink
            to="/"
            className={`terminal-nav__item ${location.pathname === '/' || location.pathname === '/home' ? 'is-active' : ''}`}
            style={{
              '--nav-color': neutralColor,
              '--nav-highlight-text': theme === 'dark' ? '#000000' : '#ffffff',
            }}
          >
            <span className="terminal-nav__main">
              <span className="terminal-nav__dot" aria-hidden="true" />
              <span className="terminal-nav__label">TERMINAL</span>
            </span>
            <span className="terminal-nav__index">00</span>
          </AppLink>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <AppLink
                key={item.to}
                to={item.to}
                className={`terminal-nav__item ${isActive ? 'is-active' : ''}`}
                style={{
                  '--nav-color': item.color,
                  '--nav-highlight-text': theme === 'dark' && item.color === '#ffffff' ? '#000000' : '#ffffff',
                }}
              >
                <span className="terminal-nav__main">
                  <span className="terminal-nav__dot" aria-hidden="true" />
                  <span className="terminal-nav__label">{item.label}</span>
                </span>
                <span className="terminal-nav__index">{item.index}</span>
              </AppLink>
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
            {!isMobileViewport || !leftSidebarOpen ? (
              <button
                type="button"
                className="terminal-shell__sidebar-toggle"
                aria-expanded={false}
                aria-controls="terminal-shell-left-sidebar"
                aria-label="Open navigation sidebar"
              title="Open navigation sidebar"
              onClick={() => setLeftSidebarOpen((value) => !value)}
            >
                <SidebarToggleIcon direction="left" collapsed size={32} />
              </button>
            ) : null}
            {!leftSidebarOpen ? (
              <AppLink to="/"><img src="/circle.svg" alt="LMNL" width="50px" /></AppLink>
            ) : <AppLink to="/"><img src="/circle.svg" alt="LMNL" width="50px" /></AppLink>}
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
              <AppLink
                to="/app"
                className="terminal-shell__profile-link"
                aria-label="Open profile"
                title="Open profile"
              >
                <ProfileIcon />
              </AppLink>
            ) : null}
            {!isMobileViewport || !rightSidebarOpen ? (
              <button
                type="button"
                className="terminal-shell__sidebar-toggle"
                aria-expanded={rightSidebarOpen}
                aria-controls="terminal-shell-right-sidebar"
              aria-label={rightSidebarOpen ? 'Close information sidebar' : 'Open information sidebar'}
              title={rightSidebarOpen ? 'Close information sidebar' : 'Open information sidebar'}
              onClick={() => setRightSidebarOpen((value) => !value)}
            >
                <SidebarToggleIcon direction="right" collapsed={!rightSidebarOpen} size={32} />
              </button>
            ) : null}
          </div>
        </header>

        <section className="terminal-shell__intro theme-page-intro">
          {introLabel ? <p className="terminal-shell__eyebrow">{introLabel}</p> : null}
          <div className="terminal-shell__title-row">
            <span className="terminal-shell__title-dot" aria-hidden="true" />
            <h1 className="terminal-shell__title">{introTitle || title}</h1>
            {introActions ? <div className="terminal-shell__intro-actions">{introActions}</div> : null}
          </div>
          {introCopy ? <p className="terminal-shell__copy">{introCopy}</p> : null}
        </section>

        <div className={['terminal-shell__content', contentClassName].filter(Boolean).join(' ')}>
          {children}
        </div>

        <footer className="terminal-shell__footer">
          <div className="terminal-shell__footer-links">
            <SocialLinks className="terminal-shell__footer-socials" iconSize={18} />
          </div>
          <AppLink to="/contact" className="terminal-shell__footer-cta theme-button">SIGNAL THE SYSTEM +</AppLink>
        </footer>
      </main>

      <aside
        id="terminal-shell-right-sidebar"
        className="terminal-shell__right theme-app-shell__sidebar theme-app-shell__sidebar--info"
        aria-hidden={!rightSidebarOpen}
      >
        {isMobileViewport && rightSidebarOpen ? (
          <div className="terminal-shell__sidebar-toggle-row terminal-shell__sidebar-toggle-row--right">
            <button
              type="button"
              className="terminal-shell__sidebar-toggle terminal-shell__sidebar-toggle--in-panel"
              aria-expanded={true}
              aria-controls="terminal-shell-right-sidebar"
              aria-label="Close information sidebar"
              title="Close information sidebar"
              onClick={() => setRightSidebarOpen(false)}
            >
              <SidebarToggleIcon direction="right" collapsed={false} size={32} />
            </button>
          </div>
        ) : null}
        {rightSidebarContent}
      </aside>
    </div>
  );
}
