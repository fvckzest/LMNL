import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { usePageColor } from '../hooks/usePageColor';
import { buildTextDescription, usePageSeo } from '../hooks/usePageSeo';
import { apiPost } from '../lib/api';
import './Success.css';

function formatDate(value) {
  if (!value) return 'TBA';
  // Use T00:00:00 to force local timezone interpretation, consistent with other pages
  const dateStr = value.includes('T') ? value : `${value}T00:00:00`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatIssuedAt(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPrice(amount) {
  if (amount === null || amount === undefined) return 'TBA';
  if (Number(amount) === 0) return 'FREE';
  return `$${(Number(amount) / 100).toFixed(2)}`;
}

function InfoRow({ label, value }) {
  return (
    <div className="success-info-row theme-data-row">
      <span className="success-info-label theme-data-label">{label}</span>
      <span className="success-info-value theme-data-value">{value || 'TBA'}</span>
    </div>
  );
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const ticketId = searchParams.get('ticketId');
  const [state, setState] = useState({
    loading: Boolean(requestId || ticketId),
    error: requestId || ticketId ? '' : 'Missing request ID or ticket ID.',
    data: null,
  });

  usePageColor('#004ffa');

  useEffect(() => {
    if (!requestId && !ticketId) {
      return;
    }

    let isActive = true;

    async function loadSuccessData() {
      setState({ loading: true, error: '', data: null });

      try {
        const data = await apiPost('/api/confirm-ticket', {
          ...(requestId ? { requestId } : {}),
          ...(ticketId ? { ticketId } : {}),
        });
        if (!isActive) return;
        setState({ loading: false, error: '', data });
      } catch (error) {
        if (!isActive) return;
        setState({
          loading: false,
          error: error.message || 'We could not confirm your order yet.',
          data: null,
        });
      }
    }

    loadSuccessData();

    return () => {
      isActive = false;
    };
  }, [requestId, ticketId]);

  const summary = state.data;
  const request = summary?.request;
  const event = summary?.event;
  const ticket = summary?.ticket;

  usePageSeo({
    title: ticket?.id ? 'LMNL | TICKET READY' : 'LMNL | ORDER CONFIRMATION',
    description: buildTextDescription(
      event?.name
        ? `Order confirmation for ${event.name}. Track ticket issuance and delivery status.`
        : 'Order confirmation and ticket delivery status.',
      'Order confirmation and ticket delivery status.',
    ),
    image: '/seo/events-seo.png',
    path: '/success',
    robots: 'noindex, nofollow',
  });

  return (
    <ContentPageShell
      title="SUCCESS"
      color="#004ffa"
      introTitle="SUCCESS"
      introCopy="PAYMENT ACKNOWLEDGED / TICKET ISSUANCE AND DELIVERY STATUS"
      contentClassName="success-content page-stack"
    >
      <div className="page-grid page-grid--two">
          <section className="success-hero-card theme-message-stack">
            <div className="success-kicker theme-kicker">ORDER CONFIRMED</div>
            <h2 className="success-subtitle theme-title-md">
              {state.loading
                ? 'Confirming your ticket now...'
                : ticket
                  ? 'Your ticket is ready.'
                  : 'Your order was received.'}
            </h2>
            <p className="success-copy theme-body-copy">
              {state.loading
                ? 'We are validating your payment and pulling together your ticket details.'
                : state.error
                  ? state.error
                  : ticket
                    ? 'Your ticket has been issued and the confirmation email is on its way.'
                    : 'Your payment landed, and we are still finalizing ticket delivery.'}
            </p>

            <div className="success-actions theme-action-row">
              {ticket ? (
                <Link to={`/ticket/${ticket.id}`} className="success-primary-btn theme-button">
                  VIEW TICKET
                </Link>
              ) : (
                <button type="button" className="success-primary-btn theme-button disabled" disabled>
                  ISSUING TICKET...
                </button>
              )}
              <Link to="/events" className="success-secondary-btn theme-button">
                BACK TO EVENTS
              </Link>
            </div>
          </section>

          <section className="success-summary-card">
            <div className="success-info-list theme-data-list">
              <InfoRow label="Event" value={event?.name || request?.eventName} />
              <InfoRow label="Guest" value={request?.customerName} />
              <InfoRow label="Email" value={request?.customerEmail} />
              <InfoRow label="Status" value={request?.status ? request.status.toUpperCase() : 'PENDING'} />
              <InfoRow label="Ticket ID" value={ticket?.id} />
              <InfoRow label="Order ID" value={request?.squareOrderId} />
              <InfoRow label="Price" value={formatPrice(event?.price)} />
              <InfoRow label="Date" value={formatDate(event?.date)} />
              <InfoRow label="Time" value={event?.time || 'TBA'} />
              <InfoRow label="Location" value={event?.locationName || 'TBA'} />
              <InfoRow label="Issued" value={formatIssuedAt(ticket?.issuedAt || request?.createdAt)} />
            </div>
          </section>
      </div>
    </ContentPageShell>
  );
}
