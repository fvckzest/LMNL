import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell, { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import CommunityMarqueeRow from '../components/community/CommunityMarqueeRow';
import CommunityStatCard from '../components/community/CommunityStatCard';
import { usePageColor } from '../hooks/usePageColor';
import { fetchCommunitySnapshot } from '../lib/siteData';
import './Community.css';

function computeStableOrderValue(member, index) {
  const signature = `${member.name || ''}|${member.event || ''}|${member.link || ''}|${index}`;

  return Array.from(signature).reduce(
    (total, character, characterIndex) => total + (character.charCodeAt(0) * (characterIndex + 1)),
    0
  );
}

function buildStableMarqueeBase(members) {
  return [...members]
    .map((member, index) => ({
      member,
      orderValue: computeStableOrderValue(member, index),
    }))
    .sort((a, b) => a.orderValue - b.orderValue)
    .map(({ member }) => member);
}

function rotateArray(arr, offset) {
  if (arr.length === 0) return [];
  const normalizedOffset = ((offset % arr.length) + arr.length) % arr.length;
  if (normalizedOffset === 0) return [...arr];
  return [...arr.slice(normalizedOffset), ...arr.slice(0, normalizedOffset)];
}

export default function Community() {
  usePageColor('#ff5bb8');

  const [credits, setCredits] = useState([]);
  const [events, setEvents] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const snapshot = await fetchCommunitySnapshot();
        setCredits(snapshot.credits || []);
        setEvents(snapshot.events || []);
        setBusinesses(snapshot.businesses || []);
      } catch (error) {
        console.error('Failed to load community data:', error);
        setCredits([]);
        setEvents([]);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const { marqueeLists, totalUnique } = useMemo(() => {
    const pMap = {};
    const aMap = {};

    events.forEach(e => {
      if (e.metadata?.performers) {
        e.metadata.performers.split(',').forEach(p => {
          const name = p.trim();
          if (!name) return;
          if (!pMap[name]) {
            pMap[name] = { name, events: new Set(), links: new Set() };
          }
          pMap[name].events.add(e.name);
        });
      }
      if (e.metadata?.artists) {
        e.metadata.artists.split(',').forEach(a => {
          const name = a.trim();
          if (!name) return;
          if (!aMap[name]) {
            aMap[name] = { name, events: new Set(), links: new Set() };
          }
          aMap[name].events.add(e.name);
        });
      }
    });

    credits.forEach(c => {
      const name = c.name?.trim();
      if (!name) return;

      if (c.role === 'performer') {
        if (!pMap[name]) {
          pMap[name] = { name, events: new Set(), links: new Set() };
        }
        if (c.event_name) pMap[name].events.add(c.event_name);
        if (c.link) pMap[name].links.add(c.link);
      } else if (c.role === 'artist') {
        if (!aMap[name]) {
          aMap[name] = { name, events: new Set(), links: new Set() };
        }
        if (c.event_name) aMap[name].events.add(c.event_name);
        if (c.link) aMap[name].links.add(c.link);
      }
    });

    const finalPerformers = Object.values(pMap).map(p => ({
      name: p.name,
      event: Array.from(p.events).join(', ') || 'LMNL',
      link: Array.from(p.links)[0] || null
    }));

    const finalArtists = Object.values(aMap).map(a => ({
      name: a.name,
      event: Array.from(a.events).join(', ') || 'LMNL',
      link: Array.from(a.links)[0] || null
    }));

    const allMembers = [...finalPerformers, ...finalArtists];
    const uniqueCount = new Set([...Object.keys(pMap), ...Object.keys(aMap)]).size;

    const getMarqueeList = (list) => {
      if (list.length === 0) return [];
      let combined = [...list];
      while (combined.length < 30) {
        combined = [...combined, ...list];
      }
      return combined;
    };

    const orderedMembers = buildStableMarqueeBase(allMembers);
    const marqueeLists = Array.from({ length: 4 }, (_, index) => {
      return getMarqueeList(rotateArray(orderedMembers, index));
    });

    return {
      marqueeLists,
      totalUnique: uniqueCount
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

  const totalBusinesses = useMemo(() => {
    const uniqueBusinesses = new Set();

    businesses.forEach((business) => {
      const normalizedName = String(business.name || '').trim().toLowerCase();
      if (normalizedName) {
        uniqueBusinesses.add(normalizedName);
      }
    });

    credits.forEach((credit) => {
      if (credit.role !== 'vendor') return;
      const normalizedName = String(credit.name || '').trim().toLowerCase();
      if (normalizedName) {
        uniqueBusinesses.add(normalizedName);
      }
    });

    pastEvents.forEach((event) => {
      const vendorList = String(event.metadata?.vendors || '');
      vendorList.split(',').forEach((vendor) => {
        const normalizedVendor = vendor.trim().toLowerCase();
        if (normalizedVendor) {
          uniqueBusinesses.add(normalizedVendor);
        }
      });
    });

    return uniqueBusinesses.size;
  }, [businesses, credits, pastEvents]);


  return (
    <ContentPageShell
      title="COMMUNITY"
      color="#ff5bb8"
      introTitle="COMMUNITY"
      introCopy="a rising tide raises all ships"
      contentClassName="community-layout page-stack"
    >
      <div className="community-layout page-stack">
        <div className="community-stats-stack page-stack">
          <CommunityStatCard
            label="events"
            value={loading ? '---' : String(pastEvents.length).padStart(3, '0')}
          />
          <CommunityStatCard
            label="creators"
            value={loading ? '---' : String(totalUnique).padStart(3, '0')}
          />
          <CommunityStatCard
            label="reach"
            value={loading ? '---' : `${String(totalCapacity).padStart(3, '0')}+`}
          />
          <CommunityStatCard
            label="businesses"
            value={loading ? '---' : String(totalBusinesses).padStart(3, '0')}
          />
        </div>

        <div className="community-split-layout theme-split-layout">
          <div className="community-content-column">
            <div className="community-test-copy page-detail-pane">
              <p className="community-copy-primary">
                LMNL makes space for artists, brands, and cultural movements to connect, create, and share. To us, coming together means being able to build something bigger than ourselves.
              </p>
              <p className="community-copy-primary">
                Whether you're an artist looking for collaboration, a brand seeking a platform, or someone who makes culture move, you've found the right place.
              </p>
              <p className="community-copy-secondary">
                Connect with us, join the conversation, and become part of the LMNL community.
              </p>
            </div>

            {!loading && marqueeLists[0]?.length > 0 && (
              <div className="marquees-wrapper">
                {marqueeLists.map((items, index) => (
                  <CommunityMarqueeRow
                    key={`marquee-row-${index + 1}`}
                    items={items}
                    rowClassName={`marquee-row-${index + 1}`}
                    rowKey={`m${index + 1}`}
                  />
                ))}
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

        {loading && <PageStatus>RETRIEVING DIRECTORY...</PageStatus>}
        {!loading && marqueeLists[0]?.length === 0 && <PageEmptyState>No community directory loaded yet.</PageEmptyState>}
      </div>
    </ContentPageShell>
  );
}
