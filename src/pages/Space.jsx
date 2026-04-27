import { useEffect, useState } from "react";
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import './Space.css';

export default function Space() {
  useEffect(() => {
    document.documentElement.style.setProperty('--page-color', '#000000');
    return () => document.documentElement.style.removeProperty('--page-color');
  }, []);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle'); // idle, loading, success, error
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [eventData, setEventData] = useState({ 
    name: 'SPACE', 
    price: undefined, 
    sold_tickets: 0, 
    capacity: 0 
  });

  const DONATION_LINKS = {
    10: 'https://square.link/u/wS5ae9vZ',
    20: 'https://square.link/u/CNarEY3J',
    50: 'https://square.link/u/koJMBswI',
    100: 'https://square.link/u/p7Z5v7zW',
  };

  useEffect(() => {
    fetchEvent();
  }, []);

  async function fetchEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('name', 'SPACE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      console.log('Fetched event data:', data);
      
      // Update immediately with database data
      let initialSyncData = { ...data, sold_tickets: 0 };
      setEventData(initialSyncData);
      
      // 1. Fetch Approved Requests Count
      const { count: approvedCount, error: countError } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', data.name)
        .eq('status', 'approved');

      if (!countError) {
        setEventData(prev => ({ ...prev, sold_tickets: approvedCount || 0 }));
      }

      // 2. If linked to Square, check real inventory & price
      if (data.square_variation_id) {
        try {
          const invRes = await fetch(`/api/check-inventory?variationId=${data.square_variation_id}`);
          if (!invRes.ok) throw new Error('Inventory API error');
          
          const invData = await invRes.json();
          console.log('Inventory data:', invData);
          
          setEventData(prev => {
            let updated = { ...prev };
            
            if (invData.count !== undefined) {
              updated.available_tickets = invData.count;
              const squareSold = Math.max(0, (data.capacity || 0) - invData.count);
              updated.sold_tickets = Math.max(updated.sold_tickets || 0, squareSold);
              
              if (invData.count <= 0) {
                updated.status = 'sold_out';
              }
            }
            
            if (invData.price !== undefined) {
              updated.price = invData.price;
            }
            
            return updated;
          });
        } catch (err) {
          console.error('Failed to sync with Square:', err);
        }
      }
    } else if (error) {
      console.error('Supabase fetch error:', error);
    }
  }

  const totalGoal = 3500;
  const soundCovered = 500;

  const nodes = [
    { name: "FORM", raised: 600, goal: 1500 },
    { name: "ENERGY", raised: 250, goal: 800 },
    { name: "ATMOSPHERE", raised: 200, goal: 700 },
  ];

  const activeRaised = nodes.reduce((sum, item) => sum + item.raised, 0);
  const totalRaised = activeRaised + soundCovered;
  const totalPct = Math.min((totalRaised / totalGoal) * 100, 100);

  const currency = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus('loading');

    const { error } = await supabase
      .from('requests')
      .insert([
        { 
          event_name: eventData.name, 
          customer_name: formData.name, 
          customer_email: formData.email 
        }
      ]);

    if (error) {
      console.error('Error submitting request:', error);
      setRequestStatus('error');
    } else {
      setRequestStatus('success');
      setFormData({ name: '', email: '' });
    }
  };

  return (
    <div className="page-container space-page">
      <HeaderBar />
      <div className="page-content space-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#000000' }} />
          <h1 className="page-title">[{eventData.name}]</h1>
        </div>

        <div className="space-body">
          <div className="space-grid">
            <div className="space-metrics-stack">
              <Timer eventDate={eventData.event_date} eventTime={eventData.event_time} />
              <OccupancyCounter 
                sold={eventData.sold_tickets} 
                capacity={eventData.capacity} 
              />
            </div>

            <SystemPanel
              totalRaised={totalRaised}
              totalGoal={totalGoal}
              totalPct={totalPct}
              currency={currency}
              nodes={nodes}
              soundCovered={soundCovered}
            />
          </div>

          <div className="space-details-row">
            <PriceIndicator 
              price={eventData.price} 
              eventStatus={eventData.status}
              onInvite={() => setShowRequestForm(true)}
              onDonate={() => setShowDonationModal(true)}
            />
              
              <div className="space-description">
                <p className="description-label">brief</p>
              <div className="description-content">
                {eventData.description ? (
                  eventData.description.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))
                ) : (
                  <p>
                    System initialized. SPACE is a collaborative experiment in form, energy, and atmosphere. 
                    All nodes are currently in the building phase. Request access to participate in the physical manifestation.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {showRequestForm && (
          <div className="request-modal-overlay">
            <div className="request-modal">
              <button className="close-modal" onClick={() => {
                setShowRequestForm(false);
                setRequestStatus('idle');
              }}>×</button>
              
              {requestStatus === 'success' ? (
                <div className="request-success">
                  <h2>REQUEST SENT.</h2>
                  <p>Check your email soon for confirmation.</p>
                  <button className="space-button" onClick={() => setShowRequestForm(false)}>close</button>
                </div>
              ) : (
                <>
                  <h2>REQUEST ACCESS</h2>
                  <p className="request-subtitle">
                    PRIVATE EVENT // {eventData.location_name && `${eventData.location_name.toUpperCase()} // `} {eventData.event_date ? new Date(eventData.event_date + 'T00:00:00').toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD'}
                  </p>
                  
                  <form onSubmit={handleRequestSubmit} className="request-form">
                    <input 
                      type="text" 
                      placeholder="NAME" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="request-input"
                    />
                    <input 
                      type="email" 
                      placeholder="EMAIL" 
                      required 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="request-input"
                    />
                    
                    {requestStatus === 'error' && (
                      <p className="error-message">System error. Please try again.</p>
                    )}
                    
                    <button 
                      type="submit" 
                      className="space-button submit-request"
                      disabled={requestStatus === 'loading'}
                    >
                      {requestStatus === 'loading' ? 'TRANSMITTING...' : 'SEND REQUEST'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {showDonationModal && (
          <div className="request-modal-overlay" onClick={() => setShowDonationModal(false)}>
            <div className="request-modal donation-modal" onClick={e => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setShowDonationModal(false)}>×</button>
              <h2>FEED THE HORSE</h2>
              <p className="request-subtitle">SELECT DONATION AMOUNT</p>
              
              <div className="donation-choices">
                <a href={DONATION_LINKS[10]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                  <span className="amount">$10</span>
                  <span className="label">SUPPORT</span>
                </a>
                <a href={DONATION_LINKS[20]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                  <span className="amount">$20</span>
                  <span className="label">SUSTAIN</span>
                </a>
                <a href={DONATION_LINKS[50]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                  <span className="amount">$50</span>
                  <span className="label">EXPAND</span>
                </a>
                <a href={DONATION_LINKS[100]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                  <span className="amount">$100</span>
                  <span className="label">COUNCIL</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}


function Timer({ eventDate, eventTime }) {
  const targetStr = (eventDate && eventTime) 
    ? `${eventDate}T${eventTime}`
    : "2026-07-03T18:00:00";
    
  const [time, setTime] = useState(() => getTimeLeft(new Date(targetStr)));

  useEffect(() => {
    const target = new Date(targetStr);
    // Update immediately when targetStr changes to avoid the jump
    setTime(getTimeLeft(target));

    const interval = setInterval(() => {
      setTime(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetStr]);

  return (
    <div className="space-timer-container">
      <p className="space-timer-label">countdown</p>
      <div className="space-timer-grid">
        <TimeUnit value={pad(time.days)} label="days" />
        <TimeUnit value={pad(time.hours)} label="hours" />
        <TimeUnit value={pad(time.minutes)} label="mins" />
        <TimeUnit value={pad(time.seconds)} label="secs" />
      </div>
    </div>
  );
}

function getTimeLeft(target) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
  const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

  return { days, hours, minutes, seconds };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function SystemPanel({ totalRaised, totalGoal, totalPct, currency, nodes, soundCovered }) {
  return (
    <div className="space-system-container">
      <p className="space-system-header">system diagnostics</p>

      <div className="space-system-progress">
        <div className="space-system-amounts">
          <span>{currency(totalRaised)} raised</span>
          <span>goal: {currency(totalGoal)}</span>
        </div>
        <div className="space-system-bar-bg">
          <div className="space-system-bar-fill" style={{ width: `${totalPct}%` }} />
        </div>
      </div>

      <div className="space-system-nodes">
        <div className="space-system-node-item sound-node">
          <div className="space-node-info">
            <span className="space-node-name">
              <span className="space-pulse-dot" />
              SOUND
            </span>
            <span className="space-node-status">ONLINE ({currency(soundCovered)})</span>
          </div>
          <div className="space-node-bar-bg">
            <div className="space-node-bar-fill completed" style={{ width: `100%` }} />
          </div>
        </div>
        
        {nodes.map((n) => {
          const pct = Math.round((n.raised / n.goal) * 100);
          return (
            <div key={n.name} className="space-system-node-item">
              <div className="space-node-info">
                <span className="space-node-name">{n.name}</span>
                <span className="space-node-pct">{pct}%</span>
              </div>
              <div className="space-node-bar-bg">
                <div className="space-node-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="space-time-unit">
      <div className="space-time-value">{value}</div>
      <div className="space-time-label">{label}</div>
    </div>
  );
}


function OccupancyCounter({ sold, capacity }) {
  const isLoaded = sold !== undefined && capacity !== undefined;
  const pct = isLoaded && capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
  
  return (
    <div className="space-occupancy-container">
      <p className="space-occupancy-label">tickets sold</p>
      <div className="space-occupancy-content">
        <div className="space-occupancy-number">
          {isLoaded ? String(sold).padStart(3, '0') : '---'} 
          <span className="separator">/</span> 
          {isLoaded ? String(capacity).padStart(3, '0') : '---'}
        </div>
        <div className="space-occupancy-bar-bg">
          <div className="space-occupancy-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function PriceIndicator({ price, eventStatus, onInvite, onDonate }) {
  const isLoaded = price !== undefined;
  const formattedPrice = isLoaded ? (price / 100).toFixed(2) : '---';

  return (
    <div className="space-price-container">
      <p className="space-price-label">admission</p>
      <div className="space-price-content">
        <div className="space-price-value">
          <span className="currency-symbol">$</span>
          {formattedPrice}
        </div>
        <div className="space-price-status">
          <span className="pulse-dot active" />
          LIVE FROM SQUARE
        </div>

        <div className="space-price-actions">
          {eventStatus === 'sold_out' ? (
            <button className="space-button sold-out" disabled>
              sold out
            </button>
          ) : (
            <button className="space-button" onClick={onInvite}>
              request invite
            </button>
          )}
          <button className="space-button" onClick={onDonate}>
            feed the horse
          </button>
        </div>
      </div>
    </div>
  );
}
