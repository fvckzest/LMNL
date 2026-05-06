import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CircularNav from '../components/CircularNav';
import DataTable from '../components/DataTable';
import SystemPanel from '../components/SystemPanel';
import TerminalShell from '../components/TerminalShell';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import { fetchNotificationEvent, getEventLink } from '../lib/siteData';

const HOME_NODES = [
  { label: 'EVENTS', index: '01', to: '/events', color: '#004ffa' },
  { label: 'SERVICES', index: '02', to: '/services', color: '#6222d8' },
  { label: 'COMMUNITY', index: '03', to: '/community', color: '#ff5bb8' },
  { label: 'SHOP', index: '04', to: '/shop', color: '#ff0000' },
  { label: 'ABOUT', index: '05', to: '/about', color: '#ff9300' },
  { label: 'BLOG', index: '06', to: '/blog', color: '#ffde00' },
  { label: 'CONTACT', index: '07', to: '/contact', color: '#90e937' },
];

const moduleRows = [
  { id: 'design', cells: ['DESIGN', 'VISUAL SYSTEMS', 'ACTIVE'] },
  { id: 'production', cells: ['PRODUCTION', 'MEDIA EXECUTION', 'ACTIVE'] },
  { id: 'events', cells: ['EVENTS', 'EXPERIENCE DESIGN', 'ACTIVE'] },
  { id: 'community', cells: ['COMMUNITY', 'NETWORK GROWTH', 'ACTIVE'] },
];

const quickLinks = [
  { label: 'ARTIFACT REGISTRY', to: '/shop' },
  { label: 'CAPABILITY MATRIX', to: '/services' },
  { label: 'FIELD NOTES', to: '/blog' },
  { label: 'INQUIRE', to: '/contact' },
];

export default function Home() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [notificationEvent, setNotificationEvent] = useState(null);
  const location = useLocation();
  const neutralColor = useThemeNeutralColor();
  const homeNodes = [...HOME_NODES, { label: 'PRSM', index: '08', to: '/prsm', color: neutralColor }];

  const pageColor = hoveredIndex !== null
    ? (hoveredIndex < homeNodes.length ? homeNodes[hoveredIndex].color : neutralColor)
    : neutralColor;

  useEffect(() => {
    let isMounted = true;

    async function fetchNotificationStatus() {
      try {
        const notifEvent = await fetchNotificationEvent();
        if (isMounted) {
          setNotificationEvent(notifEvent);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load home notification event:', error);
        }
      }
    }

    fetchNotificationStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const getNotificationLink = () => {
    return getEventLink(notificationEvent);
  };

  return (
    <TerminalShell
      title="SYSTEM"
      color={pageColor}
      introLabel="TERMINAL"
      introTitle="TERMINAL"
      introCopy="SELECT A NODE TO ENTER"
      rightSidebar={(
        <>
          <SystemPanel title="SYSTEM OVERVIEW">
            <div className="terminal-metric-list">
              <div className="terminal-metric-row"><span>EVENTS</span><span>12</span></div>
              <div className="terminal-metric-row"><span>COMMUNITY</span><span>084</span></div>
              <div className="terminal-metric-row"><span>ARTIFACTS</span><span>019</span></div>
              <div className="terminal-metric-row"><span>TRANSMISSIONS</span><span>031</span></div>
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
              <div className="terminal-log-table__row">
                <span className="terminal-log-table__dot" style={{ backgroundColor: pageColor }} />
                <span>EVENT NODE LIVE</span>
                <span>EVENT</span>
                <span>MAY 04</span>
              </div>
              <div className="terminal-log-table__row">
                <span className="terminal-log-table__dot" style={{ backgroundColor: pageColor }} />
                <span>NETWORK EXPANSION</span>
                <span>COMM</span>
                <span>APR 28</span>
              </div>
              <div className="terminal-log-table__row">
                <span className="terminal-log-table__dot" style={{ backgroundColor: pageColor }} />
                <span>FIELD NOTES</span>
                <span>LOG</span>
                <span>APR 19</span>
              </div>
            </div>
          </SystemPanel>

          <SystemPanel title="SYSTEM TIME">
            <div className="terminal-signal-list">
              <span>LOS ANGELES</span>
              <span>LOCAL CLOCK ACTIVE</span>
            </div>
          </SystemPanel>

          <SystemPanel title="NEW SIGNALS">
            {notificationEvent ? (
              <Link to={getNotificationLink()} className="home-signal-link">
                <span className="home-signal-link__dot" />
                <span>1 NEW INVITE</span>
              </Link>
            ) : (
              <div className="terminal-signal-list">
                <span>NO NEW SIGNALS</span>
                <span>STANDBY / MONITORING</span>
              </div>
            )}
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
      )}
      contentClassName="home-terminal"
    >
      <div className="home-terminal-layout">
        <section className="home-terminal__orbit">
          <CircularNav
            nodes={homeNodes}
            activePath={location.pathname}
            onNodeEnter={setHoveredIndex}
            onNodeLeave={() => setHoveredIndex(null)}
          />
        </section>

        <div className="home-terminal__lower">
          <SystemPanel title="ACTIVE MODULES">
            <DataTable
              columns={['MODULE', 'FUNCTION', 'STATUS']}
              rows={moduleRows}
            />
          </SystemPanel>

          <SystemPanel title="QUICK ACCESS">
            <div className="home-quick-links">
              {quickLinks.map((item) => (
                <Link key={item.to} to={item.to} className="home-quick-links__item">
                  <span>{item.label}</span>
                  <span>→</span>
                </Link>
              ))}
            </div>
          </SystemPanel>
        </div>
      </div>
    </TerminalShell>
  );
}
