import { Link } from 'react-router-dom';
import { formatEventTime } from '../utils/eventDisplay';

function formatNoticeDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || 'TBA';

  const [, year, month, day] = match;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

function EnvelopeRow({ label, children }) {
  return (
    <div className="shareholder-notice__envelope-row">
      <dt>{label}:</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DataRow({ label, children }) {
  return (
    <div className="shareholder-notice__data-row">
      <dt>&quot;{label}&quot;</dt>
      <dd><span aria-hidden="true">:</span> {children}</dd>
    </div>
  );
}

export default function ShareholderMeetingEvent({ event, checkoutState, onCheckout }) {
  const eventDate = formatNoticeDate(event.date);
  const eventTime = formatEventTime(event.time);
  const eventName = event.name || '2026 Annual Shareholder Meeting';
  const venue = event.venue || 'Mad Hat Tea';
  const address = event.address || '924 Broadway, Tacoma, Washington';

  return (
    <article className="shareholder-notice" aria-labelledby="shareholder-notice-title">
      <h1 className="sr-only" id="shareholder-notice-title">{eventName}</h1>
      <dl className="shareholder-notice__envelope">
        <EnvelopeRow label="from">Investor Relations &lt;4evr@lmnl.art&gt;</EnvelopeRow>
        <EnvelopeRow label="to">Shareholders</EnvelopeRow>
        <EnvelopeRow label="date">August 22, 2026</EnvelopeRow>
        <EnvelopeRow label="subject">NOTICE OF 2026 ANNUAL SHAREHOLDER MEETING</EnvelopeRow>
      </dl>

      <div className="shareholder-notice__body">
        <p>To our valued shareholders,</p>
        <p>
          You are receiving this notice because you have been identified as a participant in the
          LMNL network.
        </p>
        <p>
          The 2026 annual meeting of shareholders will be held in Tacoma at {venue} on {eventDate}.
        </p>
        <p>Meeting information is provided below:</p>

        <section className="shareholder-notice__data" aria-label="Meeting information">
          <span aria-hidden="true">{'{'}</span>
          <dl>
            <DataRow label="meeting">&quot;{eventName}&quot;,</DataRow>
            <DataRow label="type">[&quot;connection&quot;, &quot;networking&quot;],</DataRow>
            <DataRow label="date">&quot;{eventDate}&quot;,</DataRow>
            <DataRow label="time">&quot;{eventTime} Pacific&quot;,</DataRow>
            <DataRow label="price">[&quot;{event.displayPrice} online&quot;, &quot;$15 at door&quot;],</DataRow>
            <DataRow label="location">&quot;{venue}&quot;,</DataRow>
            <DataRow label="address">&quot;{address}&quot;</DataRow>
          </dl>
          <span aria-hidden="true">{'}'}</span>
        </section>

        <div className="shareholder-notice__commitments">
          <p>Here at LMNL, we remain committed to:</p>
          <ul>
            <li>delivering long-term shareholder value,</li>
            <li>accelerating network growth,</li>
            <li>exceeding key performance indicators,</li>
            <li>identifying new opportunities for strategic cultural deployment.</li>
          </ul>
        </div>

        <p>Your participation contributes directly to the strength of the network.</p>

        <div className="shareholder-notice__ticketing">
          <div>
            <span>ONLINE TICKET DESK</span>
            <strong>{event.availability}</strong>
          </div>
          <button
            className="theme-button shareholder-notice__ticket-button"
            type="button"
            onClick={onCheckout}
            disabled={!event.ticketAction.enabled || checkoutState === 'loading'}
          >
            {checkoutState === 'loading' ? 'Opening checkout...' : event.ticketAction.label}
          </button>
        </div>
        {checkoutState === 'error' ? (
          <p className="public-event-error" role="alert">Checkout is not available. Try again.</p>
        ) : null}

        <p>
          Regards,<br />
          Investor Relations
        </p>
        <p>
          Office of Corporate Strategy<br />
          Network Operations Division<br />
          LMNL, LLC
        </p>
      </div>

      <footer className="shareholder-notice__footer">
        <div>
          <Link to="/">https://lmnl.art</Link>
          <a href="https://www.instagram.com/lmnlart/" target="_blank" rel="noreferrer">@lmnlart</a>
        </div>
        <p>
          This communication may contain information intended for shareholders, builders, artists,
          musicians, performers, collaborators, collectives, businesses, and other parties interested
          in earnest connection.
        </p>
      </footer>
    </article>
  );
}
