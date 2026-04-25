import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import './Ticket.css';

export default function Ticket() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (ticketError) throw ticketError;
        setTicket(ticketData);

        if (ticketData.event_id) {
          const { data: eData, error: eError } = await supabase
            .from('events')
            .select('*')
            .eq('id', ticketData.event_id)
            .single();

          if (eError) throw eError;
          setEventData(eData);
        }
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError('System error: Ticket not found or invalid.');
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [ticketId]);

  return (
    <div className="page-container ticket-page">
      <HeaderBar />
      <div className="page-content ticket-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#000000' }} />
          <h1 className="page-title">TICKET</h1>
        </div>

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

              <div className="ticket-details-col">
                <div className="ticket-section">
                  <p className="ticket-label">EVENT</p>
                  <p className="ticket-value huge">{eventData?.name || 'LMNL Event'}</p>
                </div>

                <div className="ticket-section-group">
                  <div className="ticket-section">
                    <p className="ticket-label">DATE</p>
                    <p className="ticket-value">{eventData?.event_date ? new Date(eventData.event_date + 'T00:00:00').toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBA'}</p>
                  </div>
                  <div className="ticket-section">
                    <p className="ticket-label">TIME</p>
                    <p className="ticket-value">{eventData?.event_time || 'TBA'}</p>
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

              <div className="ticket-qr-col">
                <div className={`ticket-qr-wrapper ${ticket.is_used ? 'is-used' : ''}`}>
                  <QRCodeSVG
                    value={ticket.qr_code_payload}
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
      </div>
      <Footer />
    </div>
  );
}
