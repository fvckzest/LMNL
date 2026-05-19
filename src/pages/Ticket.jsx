import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiGet } from '../lib/api';
import ContentPageShell from '../components/ContentPageShell';
import { buildTextDescription, usePageSeo } from '../hooks/usePageSeo';
import { buildAdminCheckInUrl } from '../utils/checkInUrl';
import { formatEventDate, formatEventTime } from '../utils/eventDisplay';
import './Ticket.css';

export default function Ticket() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(ticketId));
  const [error, setError] = useState(ticketId ? null : 'Missing ticket ID.');

  const appleWalletUrl = ticketId
    ? `/api/generate-pass?ticketId=${encodeURIComponent(ticketId)}`
    : '#';
  const checkInUrl = (ticket?.qr_code_payload || ticket?.id)
    ? buildAdminCheckInUrl(ticket.qr_code_payload || ticket.id)
    : '';

  useEffect(() => {
    if (!ticketId) {
      return;
    }

    async function fetchTicket() {
      try {
        const data = await apiGet(`/api/get-ticket?ticketId=${ticketId}`);
        setTicket(data.ticket);
        setEventData(data.event);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError(err.message || 'System error: Ticket not found or invalid.');
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [ticketId]);

  usePageSeo({
    title: eventData?.name ? `LMNL | ${eventData.name} Ticket` : 'LMNL | Ticket',
    description: buildTextDescription(
      eventData?.location_name
        ? `Secure LMNL ticket access for ${eventData.name || 'your event'} at ${eventData.location_name}.`
        : `Secure LMNL ticket access for ${eventData?.name || 'your event'}.`,
      'Secure LMNL event ticket access.',
    ),
    image: '/seo/events-seo.png',
    path: `/ticket/${ticketId || ''}`,
    robots: 'noindex, nofollow',
  });

  return (
    <ContentPageShell
      title="TICKET"
      color="#9aa0a6"
      introTitle="TICKET"
      introCopy="SECURE ENTRY PASS / VALIDATION, QR DELIVERY, AND EVENT DATA"
      contentClassName="ticket-content page-stack"
    >
      <div className="ticket-body">
          {loading ? (
            <div className="ticket-message">
              <span className="pulse-dot active" />
              RETRIEVING SECURE PASS...
            </div>
          ) : error || !ticket ? (
            <div className="ticket-message error">
              <span className="pulse-dot error-dot" />
              {error || 'TICKET NOT FOUND.'}
            </div>
          ) : (
            <div className="ticket-grid">

              <div className="ticket-details-col page-panel">
                <div className="ticket-section">
                  <p className="ticket-label">EVENT</p>
                  <p className="ticket-value huge">{eventData?.name || 'LMNL Event'}</p>
                </div>

                <div className="ticket-section-group">
                  <div className="ticket-section">
                    <p className="ticket-label">DATE</p>
                    <p className="ticket-value">{formatEventDate(eventData?.event_date)}</p>
                  </div>
                  <div className="ticket-section">
                    <p className="ticket-label">TIME</p>
                    <p className="ticket-value">{formatEventTime(eventData?.event_time)}</p>
                  </div>
                </div>

                <div className="ticket-section">
                  <p className="ticket-label">LOCATION</p>
                  <p className="ticket-value">{eventData?.location_name || 'TBA'}</p>
                </div>

                <div className="ticket-section">
                  <p className="ticket-label">GUEST</p>
                  <p className="ticket-value">{ticket.customer_name}</p>
                </div>

                <div className="ticket-section status-section">
                  <p className="ticket-label">STATUS</p>
                  <div className={`ticket-status-badge ${ticket.is_used ? 'used' : 'valid'}`}>
                    {ticket.is_used ? 'SCANNED / USED' : 'VALID ENTRY'}
                  </div>
                </div>
              </div>

              <div className="ticket-qr-col page-panel">
                {!ticket.is_used && (
                  <div className="ticket-section wallet-section">
                    <a 
                      href={appleWalletUrl}
                      className="apple-wallet-button"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="apple-icon" viewBox="0 0 384 512" width="16" height="16" fill="currentColor">
                        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 91.2c12.8 45.6 39 95.7 78 95.7 19.5 0 37.5-12 65-12 27.8 0 44.8 12 65 12 38.8 0 64.5-45.4 77.3-92.8 15-50.4 21.1-100.1 21.1-101.4-.9-.7-68.5-26.1-68.5-97.3zm-68.2-121.5c14.2-18 23-43 19.2-68.7-21.9 1-49.3 14.8-65 33.9-13.1 15.8-23.9 41.3-19 66.2 24.9 2 49.2-11.5 64.8-31.4z"/>
                      </svg>
                      <span>ADD TO APPLE WALLET</span>
                    </a>
                  </div>
                )}
                <div className={`ticket-qr-wrapper ${ticket.is_used ? 'is-used' : ''}`}>
                  <QRCodeSVG
                    value={checkInUrl}
                    size={280}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"M"}
                    includeMargin={true}
                  />
                  <div className="ticket-qr-corners">
                    <span className="corner tl"></span>
                    <span className="corner tr"></span>
                    <span className="corner bl"></span>
                    <span className="corner br"></span>
                  </div>
                </div>
                <p className="ticket-qr-caption">
                  {ticket.is_used
                    ? `SCANNED ON ${new Date(ticket.used_at).toLocaleDateString()}`
                    : 'PRESENT THIS CODE AT THE DOOR'}
                </p>
              </div>

            </div>
          )}
      </div>
    </ContentPageShell>
  );
}
