import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import CommunityMarqueeRow from '../components/community/CommunityMarqueeRow';
import CommunityStatCard from '../components/community/CommunityStatCard';
import { usePageColor } from '../hooks/usePageColor';
import { fetchCommunitySnapshot } from '../lib/siteData';
import { buildCommunityDirectoryBridge } from '../lib/socialSystem';
import './Community.css';

function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function Community() {
  usePageColor('#ff5bb8');

  const [credits, setCredits] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const snapshot = await fetchCommunitySnapshot();
        setCredits(snapshot.credits || []);
        setEvents(snapshot.events || []);
      } catch (error) {
        console.error('Failed to load community data:', error);
        setCredits([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const { marqueeList1, marqueeList2, marqueeList3, totalUnique } = useMemo(() => {
    const directory = buildCommunityDirectoryBridge({ credits, events });
    const allMembers = directory.members;

    const getMarqueeList = (list) => {
      if (list.length === 0) return [];
      let combined = [...list];
      while (combined.length < 30) {
        combined = [...combined, ...list];
      }
      return combined;
    };

    return {
      marqueeList1: getMarqueeList(shuffleArray(allMembers)),
      marqueeList2: getMarqueeList(shuffleArray(allMembers)),
      marqueeList3: getMarqueeList(shuffleArray(allMembers)),
      totalUnique: directory.totalUnique
    };
  }, [credits, events]);

  const pastEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events.filter(e => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date + 'T00:00:00');
      return eventDate < now;
    });
  }, [events]);

  const totalCapacity = useMemo(() => {
    return pastEvents.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);
  }, [pastEvents]);


  return (
    <ContentPageShell title="COMMUNITY" color="#ff5bb8">
      <div className="community-layout">
        <div className="community-split-layout">
          <div className="community-stats-stack">
            <CommunityStatCard
              label="past events"
              value={loading ? '---' : String(pastEvents.length).padStart(3, '0')}
              color="#ff5bb8"
            />
            <CommunityStatCard
              label="creators count"
              value={loading ? '---' : String(totalUnique).padStart(3, '0')}
              color="#ff5bb8"
            />
            <CommunityStatCard
              label="community reach"
              value={loading ? '---' : `${String(totalCapacity).padStart(3, '0')}+`}
              color="#ff5bb8"
            />
          </div>

          <div className="community-content-column">
            <div className="community-test-copy">
              <p className="community-copy-primary">
                LMNL brings together artists, performers, and curators to challenge the boundaries of modern artistic installations. Each event marks another integration point within our decentralized creative network.
              </p>
              <p className="community-copy-secondary">
                Scroll through the expanding index below to explore the network nodes mapping the LMNL collective ecosystem.
              </p>
            </div>

            {!loading && marqueeList1.length > 0 && (
              <div className="marquees-wrapper">
                <CommunityMarqueeRow items={marqueeList1} rowClassName="marquee-row-1" rowKey="m1" />
                <CommunityMarqueeRow items={marqueeList2} rowClassName="marquee-row-2" rowKey="m2" />
                <CommunityMarqueeRow items={marqueeList3} rowClassName="marquee-row-3" rowKey="m3" />
              </div>
            )}

            <div className="community-cta-row theme-action-row">
              <a
                href="https://discord.gg/hYYfTtyJzK"
                target="_blank"
                rel="noreferrer"
                className="community-cta-button community-cta-button-primary theme-button"
              >
                Join the Discord
              </a>
              <Link
                to="share"
                className="community-cta-button community-cta-button-secondary theme-button"
              >
                Enter the Network
              </Link>
            </div>
          </div>

        </div>

        {loading && <p className="loading-text" style={{ color: '#ff5bb8' }}>RETRIEVING DIRECTORY...</p>}
        {!loading && marqueeList1.length === 0 && <p className="empty-msg">No community directory loaded yet.</p>}
      </div>
    </ContentPageShell>
  );
}
