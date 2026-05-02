import { useEffect, useState } from 'react';
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import SpaceCountdown from '../components/space/SpaceCountdown';
import SpaceOccupancy from '../components/space/SpaceOccupancy';
import SpacePriceCard from '../components/space/SpacePriceCard';
import SpaceSystemPanel from '../components/space/SpaceSystemPanel';
import { usePageColor } from '../hooks/usePageColor';
import { apiPost } from '../lib/api';
import { fetchSpaceEventSnapshot } from '../lib/siteData';
import './Space.css';

export default function Space() {
  usePageColor('#000000');

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState('idle');
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
    async function loadEvent() {
      try {
        const snapshot = await fetchSpaceEventSnapshot();
        if (snapshot) {
          setEventData(snapshot);
        }
      } catch (error) {
        console.error('Failed to load SPACE event:', error);
      }
    }

    loadEvent();
  }, []);

  const totalGoal = 3500;
  const soundCovered = 500;

  const nodes = [
    { name: 'FORM', raised: 600, goal: 1500 },
    { name: 'ENERGY', raised: 250, goal: 800 },
    { name: 'ATMOSPHERE', raised: 200, goal: 700 },
  ];

  const activeRaised = nodes.reduce((sum, item) => sum + item.raised, 0);
  const totalRaised = activeRaised + soundCovered;
  const totalPct = Math.min((totalRaised / totalGoal) * 100, 100);

  const currency = (n) =>
    new Intl.NumberFormat("en-US", {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus('loading');

    try {
      await apiPost('/api/requests', {
        action: 'create',
        eventName: eventData.name,
        customerName: formData.name,
        customerEmail: formData.email,
      });
      setRequestStatus('success');
      setFormData({ name: '', email: '' });
    } catch (error) {
      console.error('Error submitting request:', error);
      setRequestStatus('error');
    }
  };

  const handlePurchase = async () => {
    if (!eventData.id) return;

    setPurchaseStatus('loading');
    try {
      const result = await apiPost('/api/create-event-checkout', {
        eventId: eventData.id,
      });
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      console.error('Error creating event checkout:', error);
      setPurchaseStatus('error');
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
              <SpaceCountdown eventDate={eventData.event_date} eventTime={eventData.event_time} />
              <SpaceOccupancy
                sold={eventData.sold_tickets} 
                capacity={eventData.capacity} 
              />
            </div>

            <SpaceSystemPanel
              totalRaised={totalRaised}
              totalGoal={totalGoal}
              totalPct={totalPct}
              currency={currency}
              nodes={nodes}
              soundCovered={soundCovered}
            />
          </div>

          <div className="space-details-row">
            <SpacePriceCard
              price={eventData.price} 
              eventStatus={eventData.status}
              isPrivate={eventData.is_private}
              eventId={eventData.id}
              onInvite={() => setShowRequestForm(true)}
              onPurchase={handlePurchase}
              onDonate={() => setShowDonationModal(true)}
            />
            {purchaseStatus === 'error' && (
              <p className="error-message">Unable to open checkout right now. Please try again.</p>
            )}
              
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
