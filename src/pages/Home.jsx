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
      introTitle="TERMINAL"
      introCopy="SELECT A NODE TO ENTER"
      metaNote={null}
      rightSidebarFooter={(
        <p className="home-terminal__system-note">
          A creative platform for events, artists, artifacts, and cultural systems.
        </p>
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
