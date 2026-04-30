import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import './Community.css';

export default function Community() {
  useEffect(() => {
    document.documentElement.style.setProperty('--page-color', '#ff5bb8');
    return () => document.documentElement.style.removeProperty('--page-color');
  }, []);

  const [credits, setCredits] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: creditsData } = await supabase
        .from('community_credits')
        .select('*');
      
      const { data: eventsData } = await supabase
        .from('events')
        .select('*');

      setCredits(creditsData || []);
      setEvents(eventsData || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const { marqueeList1, marqueeList2, marqueeList3, totalUnique } = useMemo(() => {
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
      } else {
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

    const shuffleArray = (arr) => {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    };

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


  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#ff5bb8' }} />
          <h1 className="page-title">COMMUNITY</h1>
        </div>

        <div className="community-layout">
          <div className="community-split-layout">
            
            {/* Left Column: Stacked Numbers */}
            <div className="community-stats-stack" style={{ display: 'flex', flexDirection: 'column', gap: '40px', flex: '1', minWidth: '200px', maxWidth: '250px' }}>
              
              {/* Counter 0: Past Events Count */}
              <div className="space-occupancy-container">
                <p className="space-occupancy-label" style={{ color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '500' }}>past events</p>
                <div className="space-occupancy-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                  <div className="space-occupancy-number" style={{ fontSize: '50px', fontWeight: '500', color: '#000', letterSpacing: '-0.02em', lineHeight: '1' }}>
                    {loading ? '---' : String(pastEvents.length).padStart(3, '0')}
                  </div>
                  <div className="space-occupancy-bar-bg" style={{ height: '3px', width: '50%', backgroundColor: '#eaeaea' }}>
                    <div className="space-occupancy-bar-fill" style={{ height: '100%', width: `100%`, backgroundColor: '#ff5bb8' }} />
                  </div>
                </div>
              </div>

              {/* Counter 1: Creators Count */}
              <div className="space-occupancy-container">
                <p className="space-occupancy-label" style={{ color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '500' }}>creators count</p>
                <div className="space-occupancy-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                  <div className="space-occupancy-number" style={{ fontSize: '50px', fontWeight: '500', color: '#000', letterSpacing: '-0.02em', lineHeight: '1' }}>
                    {loading ? '---' : String(totalUnique).padStart(3, '0')}
                  </div>
                  <div className="space-occupancy-bar-bg" style={{ height: '3px', width: '50%', backgroundColor: '#eaeaea' }}>
                    <div className="space-occupancy-bar-fill" style={{ height: '100%', width: `100%`, backgroundColor: '#ff5bb8' }} />
                  </div>
                </div>
              </div>

              {/* Counter 2: Attendees Reach */}
              <div className="space-occupancy-container">
                <p className="space-occupancy-label" style={{ color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '500' }}>community reach</p>
                <div className="space-occupancy-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                  <div className="space-occupancy-number" style={{ fontSize: '50px', fontWeight: '500', color: '#000', letterSpacing: '-0.02em', lineHeight: '1' }}>
                    {loading ? '---' : String(totalCapacity).padStart(3, '0') + '+'}
                  </div>
                  <div className="space-occupancy-bar-bg" style={{ height: '3px', width: '50%', backgroundColor: '#eaeaea' }}>
                    <div className="space-occupancy-bar-fill" style={{ height: '100%', width: `100%`, backgroundColor: '#ff5bb8' }} />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Test Copy */}
            <div className="community-test-copy" style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px', alignSelf: 'flex-start' }}>
              <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#333', margin: 0 }}>
                LMNL brings together artists, performers, and curators to challenge the boundaries of modern artistic installations. Each event marks another integration point within our decentralized creative network.
              </p>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#666', margin: 0 }}>
                Scroll through the expanding index below to explore the network nodes mapping the LMNL collective ecosystem.
              </p>
            </div>

          </div>

          {!loading && marqueeList1.length > 0 && (
            <div className="marquees-wrapper">
              {/* Marquee 1: Left */}
              <div className="marquee-row marquee-row-1">
                <div className="marquee-track">
                  {marqueeList1.map((item, idx) => (
                    <div key={`m1-${idx}`} className="marquee-item">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noreferrer" className="marquee-name-link">
                          {item.name}
                        </a>
                      ) : (
                        <span className="marquee-name">{item.name}</span>
                      )}
                      <span className="marquee-event">{item.event}</span>
                      <span className="marquee-divider">•</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marquee 2: Right */}
              <div className="marquee-row marquee-row-2">
                <div className="marquee-track">
                  {marqueeList2.map((item, idx) => (
                    <div key={`m2-${idx}`} className="marquee-item">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noreferrer" className="marquee-name-link">
                          {item.name}
                        </a>
                      ) : (
                        <span className="marquee-name">{item.name}</span>
                      )}
                      <span className="marquee-event">{item.event}</span>
                      <span className="marquee-divider">•</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marquee 3: Left */}
              <div className="marquee-row marquee-row-3">
                <div className="marquee-track">
                  {marqueeList3.map((item, idx) => (
                    <div key={`m3-${idx}`} className="marquee-item">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noreferrer" className="marquee-name-link">
                          {item.name}
                        </a>
                      ) : (
                        <span className="marquee-name">{item.name}</span>
                      )}
                      <span className="marquee-event">{item.event}</span>
                      <span className="marquee-divider">•</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && <p className="loading-text" style={{ color: '#ff5bb8' }}>RETRIEVING DIRECTORY...</p>}
          {!loading && marqueeList1.length === 0 && <p className="empty-msg">No community directory loaded yet.</p>}
        </div>
      </div>

      <Footer />
    </div>
  );
}
