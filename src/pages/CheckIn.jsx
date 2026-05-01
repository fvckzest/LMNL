import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import { apiGet, apiPost } from '../lib/api';
import { formatEventDate, formatEventTime } from '../utils/eventDisplay';
import './CheckIn.css';

function formatTimestamp(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
}

export default function CheckIn() {
  const { token } = useParams();
  const [checkInData, setCheckInData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasToken = Boolean(token);

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    let isCancelled = false;

    async function loadTicket() {
      try {
        const data = await apiGet(`/api/check-in-ticket?token=${encodeURIComponent(token)}`, { auth: true });
        if (!isCancelled) {
          setCheckInData(data);
          setError('');
        }
      } catch (err) {
        if (!isCancelled) {
          setCheckInData(null);
          setError(err.message || 'Ticket not found.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadTicket();
    return () => {
      isCancelled = true;
    };
  }, [hasToken, token]);

  async function handleConfirm() {
    if (!token || submitting) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = await apiPost('/api/check-in-ticket', { token }, { auth: true });
      setCheckInData(data);
    } catch (err) {
      setError(err.message || 'Unable to confirm wristband issuance.');
    } finally {
      setSubmitting(false);
    }
  }

  const ticket = checkInData?.ticket;
  const event = checkInData?.event;
  const status = !hasToken
    ? 'invalid'
    : error
    ? 'invalid'
    : (checkInData?.status || 'valid');
  const isAlreadyUsed = status === 'already_used';
  const isCompleted = checkInData?.status === 'checked_in';
  const canConfirm = status === 'valid' && !submitting;

  return (
    <div className="page-container checkin-page">
      <HeaderBar />
      <div className="page-content checkin-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#004ffa' }} />
          <h1 className="page-title">CHECK-IN</h1>
        </div>

        <div className="checkin-body">
          <div className="checkin-card">
            <div className={`checkin-status checkin-status-${status}`}>
              {loading
                ? 'Loading ticket...'
                : isCompleted
                  ? 'Wristband issued'
                  : isAlreadyUsed
                    ? 'Already checked in'
                    : !hasToken || error
                      ? 'Invalid ticket'
                      : 'Valid ticket'}
            </div>

            {loading ? (
              <p className="checkin-note">Resolving ticket and event details.</p>
            ) : !hasToken || error ? (
              <p className="checkin-note">{error || 'Invalid ticket link.'}</p>
            ) : (
              <>
                <div className="checkin-section">
                  <p className="checkin-label">Guest</p>
                  <p className="checkin-value">{ticket?.customer_name || 'Unknown guest'}</p>
                </div>

                <div className="checkin-section">
                  <p className="checkin-label">Event</p>
                  <p className="checkin-value">{event?.name || 'LMNL Event'}</p>
                </div>

                <div className="checkin-meta-grid">
                  <div className="checkin-section">
                    <p className="checkin-label">Date</p>
                    <p className="checkin-meta-value">{formatEventDate(event?.event_date)}</p>
                  </div>
                  <div className="checkin-section">
                    <p className="checkin-label">Time</p>
                    <p className="checkin-meta-value">{formatEventTime(event?.event_time)}</p>
                  </div>
                </div>

                <div className="checkin-section">
                  <p className="checkin-label">Location</p>
                  <p className="checkin-meta-value">{event?.location_name || 'TBA'}</p>
                </div>

                <div className="checkin-section">
                  <p className="checkin-label">Status</p>
                  <p className="checkin-meta-value">
                    {isCompleted
                      ? `Completed at ${formatTimestamp(checkInData?.ticket?.used_at)}`
                      : isAlreadyUsed
                        ? `Already checked in at ${formatTimestamp(ticket?.used_at)}`
                        : 'Ready to issue wristband'}
                  </p>
                </div>

                <button
                  type="button"
                  className="checkin-primary-button"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                >
                  {submitting ? 'ISSUING...' : 'WRISTBAND ISSUED'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
