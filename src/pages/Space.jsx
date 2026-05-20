import { useEffect, useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import SpaceActivityList from '../components/space/SpaceActivityList';
import SpaceCountdown from '../components/space/SpaceCountdown';
import SpaceOccupancy from '../components/space/SpaceOccupancy';
import SpacePriceCard from '../components/space/SpacePriceCard';
import SpaceSystemPanel from '../components/space/SpaceSystemPanel';
import { usePageColor } from '../hooks/usePageColor';
import { apiPost } from '../lib/api';
import { fetchSpaceEventSnapshot, fetchSpaceTicketActivity } from '../lib/siteData';
import './Space.css';

export default function Space() {
  usePageColor('#004ffa');

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState('idle');
  const [requestStatus, setRequestStatus] = useState('idle'); // idle, loading, success, error
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [activityItems, setActivityItems] = useState([]);
  const [activityLive, setActivityLive] = useState(false);
  const [activityBootstrapped, setActivityBootstrapped] = useState(false);
  const [eventData, setEventData] = useState({
    name: '[SPACE]',
    image_url: '',
    price: undefined,
    sold_tickets: 0,
    capacity: 0
  });

  const introLogo = (
    <span className="space-page-title-logo">
      <img
        src={eventData.image_url || '/lmnl-logo-black.png'}
        alt={eventData.name || 'SPACE'}
        className="space-page-title-logo__image"
      />
    </span>
  );

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
          setActivityItems(Array.isArray(snapshot.activity) ? snapshot.activity : []);
          setActivityLive(snapshot.activity_live === true);
          setActivityBootstrapped(Array.isArray(snapshot.activity));
        }
      } catch (error) {
        console.error('Failed to load SPACE event:', error);
      }
    }

    loadEvent();
  }, []);

  useEffect(() => {
    if (!eventData.id) {
      return undefined;
    }

    let isMounted = true;

    async function loadActivity() {
      try {
        const response = await fetchSpaceTicketActivity(eventData.id);
        if (!isMounted) return;

        setActivityItems(response.activity);
        setActivityLive(true);
        setEventData((current) => ({
          ...current,
          sold_tickets: Number.isFinite(response.soldTickets)
            ? response.soldTickets
            : current.sold_tickets,
        }));
      } catch (error) {
        console.error('Failed to load SPACE ticket activity:', error);
        if (isMounted) {
          setActivityLive(false);
        }
      }
    }

    if (!activityBootstrapped) {
      loadActivity();
    }

    const intervalId = window.setInterval(loadActivity, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activityBootstrapped, eventData.id]);

  const totalGoal = 2000;
  const sourcedSoundAmount = 500;
  const ticketPrice = (Number(eventData.price) || 0) / 100;
  const soldTickets = Number(eventData.sold_tickets) || 0;
  const ticketRaised = soldTickets * ticketPrice;
  const totalRaised = sourcedSoundAmount + ticketRaised;
  const totalPct = Math.min((totalRaised / totalGoal) * 100, 100);

  const goalRows = [
    { name: 'SOUND', goal: sourcedSoundAmount, detail: 'PA, DJ monitoring, room tuning, and playback infrastructure.' },
    { name: 'POWER', goal: 500, detail: 'Distribution, cabling, load support, and technical reliability across the room.' },
    { name: 'STAGE', goal: 700, detail: 'Platform buildout, sightlines, risers, and performance flow.' },
    { name: 'DESIGN', goal: 650, detail: 'Spatial treatment, visual identity, and finishing touches that shape the atmosphere.' },
  ].map((row, index) => {
    if (index === 0) {
      return {
        ...row,
        raised: row.goal,
        isOnline: true,
      };
    }

    const raisedBeforeRow = (index - 1) * row.goal;
    const rowRaised = Math.min(Math.max(ticketRaised - raisedBeforeRow, 0), row.goal);

    return {
      ...row,
      raised: rowRaised,
      isOnline: rowRaised >= row.goal,
    };
  });

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
    <ContentPageShell
      title={eventData.name || 'SPACE'}
      color="#004ffa"
      introTitle={introLogo}
      introCopy="MAKING SPACE, TOGETHER"
      contentClassName="space-content page-stack"
    >
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
            rows={goalRows}
          />
        </div>

        <div className="space-details-row">
          <div className="space-description">
            <p className="description-label">brief</p>
            <div className="description-content">
              {eventData.description ? (
                eventData.description.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))
              ) : (
                <p>
                </p>
              )}
            </div>
          </div>

          <div className="space-price-panel">
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
          </div>
        </div>

        <SpaceActivityList items={activityItems} isLive={activityLive} />
      </div>

      {showRequestForm && (
        <div
          className="request-modal-overlay"
          onClick={() => {
            setShowRequestForm(false);
            setRequestStatus('idle');
          }}
        >
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => {
              setShowRequestForm(false);
              setRequestStatus('idle');
            }}>×</button>

            {requestStatus === 'success' ? (
              <div className="request-success">
                <h2>REQUEST SENT.</h2>
                <p>Confirmation email will be sent soon.</p>
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
              </a>
              <a href={DONATION_LINKS[20]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                <span className="amount">$20</span>
              </a>
              <a href={DONATION_LINKS[50]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                <span className="amount">$50</span>
              </a>
              <a href={DONATION_LINKS[100]} target="_blank" rel="noopener noreferrer" className="donation-choice">
                <span className="amount">$100</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </ContentPageShell>
  );
}
