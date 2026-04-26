import { useState, Fragment, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import './Events.css';

const upcomingEvent = {
  id: 'next-fest',
  title: 'LMNL FEST 2026',
  date: 'June 15, 2026',
  location: 'LMNL Space, LA',
  description: 'Our biggest gathering yet. A multi-day festival celebrating the intersection of art, technology, and community. Featuring live performances, interactive installations, and exclusive drops.',
  rsvpLink: '#rsvp',
  price: 2500,
  is_private: false
};

const eventsData = [
  {
    id: 'space',
    title: 'LMNL SPACE',
    type: 'text',
    display: '[SPACE]',
    link: '/space',
    date: 'Ongoing',
    description: 'The main LMNL space. A hub for creativity, collaboration, and innovation. Join us for workshops, exhibitions, and community gatherings.',
    performers: 'LMNL Resident DJs, Special Guests',
    artists: 'Visualist X, Sculptor Y',
    media: []
  },
  {
    id: 'camp-zest',
    title: 'Camp Zest',
    type: 'image',
    display: '/cz1.png',
    date: 'Summer 2025',
    description: 'An immersive summer experience bringing together creators, builders, and thinkers for a week of intense collaboration and learning.',
    media: []
  },
  {
    id: 'bloom',
    title: 'Bloom',
    type: 'image',
    display: '/title1.png',
    date: 'Spring 2025',
    description: 'A celebration of new beginnings, showcasing the latest creative projects and breakthroughs in our community.',
    media: []
  },
  {
    id: 'genesis',
    title: 'Genesis',
    type: 'image',
    display: '/genesis-logo.png',
    date: 'Winter 2024',
    description: 'The inception of the LMNL journey. This event marked the beginning of our mission to redefine creative spaces.',
    media: []
  }
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [featuredEvent, setFeaturedEvent] = useState(upcomingEvent);
  const [loading, setLoading] = useState(true);
  const timelineRef = useRef(null);

  useEffect(() => {
    async function fetchSupabaseEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(e => ({
          id: e.id,
          title: e.name,
          type: e.image_url ? 'image' : 'text',
          display: e.image_url || `[${e.name.toUpperCase()}]`,
          link: e.partiful_url || e.spotify_id || '',
          date: e.event_date,
          description: e.description,
          performers: e.metadata?.performers || '',
          artists: e.metadata?.artists || '',
          media: e.metadata?.media || [],
          is_featured: e.metadata?.is_featured || false,
          location: e.location_name || 'LMNL Space, LA'
        }));
        
        setEvents(mapped);
        setSelectedId(mapped[0].id);

        const feat = mapped.find(e => e.is_featured);
        if (feat) {
          setFeaturedEvent({
            id: feat.id,
            title: feat.title,
            date: feat.date,
            location: feat.location,
            description: feat.description,
            rsvpLink: feat.link || '#rsvp'
          });
        }
      } else {
        setEvents(eventsData);
        setSelectedId(eventsData[0].id);
      }
      setLoading(false);
    }
    fetchSupabaseEvents();
  }, []);

  const selectedEvent = events.find(e => e.id === selectedId);

  useEffect(() => {
    if (events.length > 0 && timelineRef.current) {
      const el = timelineRef.current;
      const timer = setTimeout(() => {
        el.scrollLeft = el.scrollWidth / 3;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [events]);

  const handleScroll = () => {
    if (!timelineRef.current) return;
    const el = timelineRef.current;
    const singleSetWidth = el.scrollWidth / 3;
    
    if (el.scrollLeft <= 5) {
      el.scrollLeft += singleSetWidth;
    } else if (el.scrollLeft >= singleSetWidth * 2 - 5) {
      el.scrollLeft -= singleSetWidth;
    }
  };

  const extendedEvents = events.length > 0 ? [...events, ...events, ...events] : [];

  const scrollTimeline = (direction) => {
    if (timelineRef.current) {
      const el = timelineRef.current;
      const nodes = el.querySelectorAll('.timeline-node-wrapper');
      if (nodes.length >= 2) {
        const rect0 = nodes[0].getBoundingClientRect();
        const rect1 = nodes[1].getBoundingClientRect();
        const scrollAmount = Math.abs(rect1.left - rect0.left);
        
        el.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      } else {
        el.scrollBy({
          left: direction === 'left' ? -192 : 192,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content events-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#004ffa' }} />
          <h1 className="page-title events-title">EVENTS</h1>
        </div>

        {/* Upcoming Event Highlight */}
        <div className="upcoming-event-section">
          <div className="upcoming-glow" />
          <div className="upcoming-content">
            <div className="upcoming-tag">UPCOMING EVENT</div>
            <h2 className="upcoming-title">{featuredEvent.title}</h2>
            <div className="upcoming-meta">
              <span className="upcoming-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {featuredEvent.date}
              </span>
              <span className="upcoming-location">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {featuredEvent.location}
              </span>
            </div>

            <div className="upcoming-meta" style={{ marginTop: '-15px', marginBottom: '25px' }}>
              <span className="upcoming-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                {featuredEvent.price === 0 || !featuredEvent.price ? 'FREE' : `$${(featuredEvent.price / 100).toFixed(2)}`}
              </span>
              <span className="upcoming-location">
                {featuredEvent.is_private ? (
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
            <p className="upcoming-description">{featuredEvent.description}</p>
            <a href={featuredEvent.rsvpLink} className="upcoming-rsvp-btn">
              RSVP NOW
            </a>
          </div>
        </div>

        {loading ? (
          <p className="loading-text" style={{ textAlign: 'center', margin: '50px 0', fontFamily: 'Gantari', color: '#004ffa', letterSpacing: '0.1em', fontWeight: '600' }}>RETRIEVING TIMELINE...</p>
        ) : events.length === 0 ? (
          <p className="loading-text" style={{ textAlign: 'center', margin: '50px 0', fontFamily: 'Gantari', letterSpacing: '0.1em', fontWeight: '600' }}>NO EVENTS FOUND.</p>
        ) : (
          <>
            <div className="timeline-wrapper">
              <button className="timeline-arrow left" onClick={() => scrollTimeline('left')} aria-label="Scroll Left">
                &larr;
              </button>
              <div className="events-timeline-container" ref={timelineRef} onScroll={handleScroll}>
                <div className="events-timeline-horizontal">
                  {extendedEvents.map((event, index) => (
                    <Fragment key={`${event.id}-${index}`}>
                      <div className="timeline-node-wrapper">
                        <button 
                          className={`timeline-node ${selectedId === event.id ? 'active' : ''}`}
                          onClick={() => setSelectedId(event.id)}
                          aria-label={`Select ${event.title}`}
                        >
                          {event.type === 'text' ? (
                            <h2 className="events-space-title">{event.display}</h2>
                          ) : (
                            <img src={event.display} alt={event.title} className="events-img" />
                          )}
                        </button>
                      </div>
                      {index < extendedEvents.length - 1 && (
                        <div className="timeline-inter-node" />
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
              <button className="timeline-arrow right" onClick={() => scrollTimeline('right')} aria-label="Scroll Right">
                &rarr;
              </button>
            </div>

            {selectedEvent && (
              <div className="event-detail-card">
                <div className="card-glow" />
                <div className="card-content">
                  <div className="card-header">
                    <h2 className="card-title">{selectedEvent.title}</h2>
                    <span className="card-date">{selectedEvent.date}</span>
                  </div>
                  <p className="card-description">{selectedEvent.description}</p>
                  
                  {selectedEvent.link && (
                    <a href={selectedEvent.link} className="card-action-btn">
                      Explore Space
                    </a>
                  )}

                  {selectedEvent.performers && (
                    <div className="card-lineup-section">
                      <h3 className="lineup-title">LINEUP</h3>
                      <div className="lineup-grid">
                        {selectedEvent.performers.split(',').map((perf, idx) => (
                          <span key={idx} className="lineup-artist">{perf.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.artists && (
                    <div className="card-lineup-section card-artists-section">
                      <h3 className="lineup-title">FEATURED ARTISTS</h3>
                      <div className="lineup-grid">
                        {selectedEvent.artists.split(',').map((art, idx) => (
                          <span key={idx} className="lineup-artist artist-pill">{art.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="card-media-section">
                    <h3 className="media-section-title">Media Gallery</h3>
                    <div className="media-grid-placeholder">
                      <div className="placeholder-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Coming Soon</span>
                      </div>
                      <div className="placeholder-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        <span>Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
