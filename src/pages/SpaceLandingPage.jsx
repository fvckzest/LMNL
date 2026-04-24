import { useEffect, useState } from "react";
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import './SpaceLandingPage.css';

export default function SpaceLandingPage() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle'); // idle, loading, success, error
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [eventData, setEventData] = useState({ name: 'SPACE.', price: 10000 });

  useEffect(() => {
    fetchEvent();
  }, []);

  async function fetchEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      let finalData = { ...data };
      
      // If linked to Square, check real inventory
      if (data.square_variation_id) {
        try {
          const invRes = await fetch(`/api/check-inventory?variationId=${data.square_variation_id}`);
          const invData = await invRes.json();
          
          if (invData.count !== undefined && invData.count <= 0) {
            finalData.status = 'sold_out';
          }
        } catch (err) {
          console.error('Failed to check inventory:', err);
        }
      }
      
      setEventData(finalData);
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

    const { data, error } = await supabase
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
    <div className="page-container">
      <HeaderBar />
      <div className="page-content space-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#000000' }} />
          <h1 className="page-title">[{eventData.name}]</h1>
        </div>

        <div className="space-body">
          <div className="space-grid">
            <Timer eventDate={eventData.event_date} eventTime={eventData.event_time} />
            <SystemPanel
              totalRaised={totalRaised}
              totalGoal={totalGoal}
              totalPct={totalPct}
              currency={currency}
            />
          </div>

          <NodeSystem nodes={nodes} soundCovered={soundCovered} currency={currency} />

          <div className="space-actions">
            {eventData.status === 'sold_out' ? (
              <button className="space-button sold-out" disabled>
                sold out
              </button>
            ) : (
              <button className="space-button" onClick={() => setShowRequestForm(true)}>
                request invite
              </button>
            )}
            <button className="space-button">
              feed the horse
            </button>
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
      </div>
      <Footer />
    </div>
  );
}

function NodeSystem({ nodes, soundCovered, currency }) {
  return (
    <div className="space-nodes-container">
      <div className="space-nodes-status">
        <span className="space-pulse-dot" />
        sound online ({currency(soundCovered)})
      </div>

      <div className="space-nodes-grid">
        {nodes.map((n) => {
          const pct = Math.round((n.raised / n.goal) * 100);
          return (
            <div key={n.name} className="space-node-item">
              <p className="space-node-name">{n.name}</p>
              <div className="space-node-bar-bg">
                <div className="space-node-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="space-node-pct">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timer({ eventDate, eventTime }) {
  const targetStr = (eventDate && eventTime) 
    ? `${eventDate}T${eventTime}`
    : "2026-07-03T20:00:00";
    
  const target = new Date(targetStr);
  const [time, setTime] = useState(getTimeLeft(target));

  useEffect(() => {
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

function SystemPanel({ totalRaised, totalGoal, totalPct, currency }) {
  return (
    <div className="space-system-container">
      <p className="space-system-header">system</p>

      <div className="space-system-progress">
        <div className="space-system-amounts">
          <span>{currency(totalRaised)}</span>
          <span>{currency(totalGoal)}</span>
        </div>
        <div className="space-system-bar-bg">
          <div className="space-system-bar-fill" style={{ width: `${totalPct}%` }} />
        </div>
      </div>

      <div className="space-system-statuses">
        <Status label="sound" value="online" online />
        <Status label="form" value="building" />
        <Status label="energy" value="building" />
        <Status label="atmosphere" value="building" />
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

function Status({ label, value, online }) {
  return (
    <div className="space-status-item">
      <span className="space-status-label">{label}</span>
      <span className="space-status-value">
        {online && <span className="space-pulse-dot" />}
        {value}
      </span>
    </div>
  );
}
