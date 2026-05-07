import { useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { useTheme } from '../components/ThemeProvider';
import SocialLinks from '../components/SocialLinks';
import Turnstile from '../components/Turnstile';
import { apiPost, getTurnstileSiteKey } from '../lib/api';
import './Contact.css';

function ContactSidebar({ status }) {
  return (
    <>
      <SystemPanel title="ROUTING STATUS">
        <div className="terminal-metric-list">
          <div className="terminal-metric-row"><span>NODE</span><span>CONTACT</span></div>
          <div className="terminal-metric-row"><span>INTAKE</span><span>{status === 'loading' ? 'ACTIVE' : 'READY'}</span></div>
          <div className="terminal-metric-row"><span>ROUTE</span><span>GENERAL</span></div>
        </div>
      </SystemPanel>

      <SystemPanel title="MESSAGE PROTOCOL">
        <div className="contact-sidebar-copy">
          <p>Use this terminal for general outreach, partnership questions, or project context before a scoped inquiry.</p>
          <p>For detailed project builds, the services route remains the primary intake path.</p>
        </div>
      </SystemPanel>
    </>
  );
}

export default function Contact() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await apiPost('/api/service-inquiries', {
        action: 'create',
        name: formData.name,
        email: formData.email,
        notes: `SUBJECT: ${formData.subject}\n\n${formData.message}`,
        selectedServices: ['general'],
        turnstileToken,
      });
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Transmission failed. Please try again.');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    }
  };

  const handleReset = () => {
    setStatus('idle');
  };

  return (
    <ContentPageShell
      title="CONTACT"
      color="#90e937"
      introTitle="CONTACT"
      introCopy="GENERAL INQUIRIES, SOCIAL LINKS, AND DIRECT MESSAGE ROUTING"
      rightSidebar={<ContactSidebar status={status} />}
      contentClassName="page-stack"
    >
      <div className="contact-layout">
        <section className="contact-info-section">
          <div className="page-panel">
            <p className="page-block-label">Primary Channel</p>
            <a href="mailto:hi@lmnl.art" className="contact-info-value page-link">hi@lmnl.art</a>
          </div>

          <div className="page-panel">
            <p className="page-block-label">Social Channels</p>
            <SocialLinks iconSize={24} />
          </div>
        </section>

        <section className="contact-form-section page-form-shell theme-panel-stack">
          <div className="contact-form-section__header theme-panel-header">
            <p className="page-block-label">Signal Intake</p>
            <p className="contact-form-section__copy theme-body-copy">Send a message into the system and route it to the right collaboration path.</p>
          </div>
          {status === 'success' ? (
            <div className="inquiry-success theme-message-stack">
              <h3 className="success-title theme-title-md">TRANSMISSION RECEIVED.</h3>
              <p className="success-text theme-body-copy">Thank you for reaching out. We will get back to you shortly.</p>
              <button className="reset-btn" onClick={handleReset}>SEND ANOTHER MESSAGE</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="theme-form">
              <div className="theme-field">
                <label className="theme-field-label" htmlFor="contact-name">NAME / ENTITY</label>
                <input
                  type="text"
                  id="contact-name"
                  className="theme-input"
                  placeholder="YOUR NAME"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="theme-field">
                <label className="theme-field-label" htmlFor="contact-email">EMAIL ADDRESS</label>
                <input
                  type="email"
                  id="contact-email"
                  className="theme-input"
                  placeholder="EMAIL@EXAMPLE.COM"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="theme-field">
                <label className="theme-field-label" htmlFor="contact-subject">SUBJECT</label>
                <input
                  type="text"
                  id="contact-subject"
                  className="theme-input"
                  placeholder="RE: ..."
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="theme-field">
                <label className="theme-field-label" htmlFor="contact-message">MESSAGE</label>
                <textarea
                  id="contact-message"
                  className="theme-input"
                  placeholder="YOUR MESSAGE..."
                  rows="5"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  disabled={status === 'loading'}
                />
              </div>

              <Turnstile
                siteKey={getTurnstileSiteKey()}
                onTokenChange={setTurnstileToken}
                resetSignal={turnstileResetSignal}
                theme={theme}
              />

              {status === 'error' && (
                <p className="page-form-error">
                  {errorMessage.toUpperCase()}
                </p>
              )}

              <button
                type="submit"
                className="theme-button"
                disabled={status === 'loading' || !turnstileToken}
              >
                {status === 'loading' ? 'TRANSMITTING...' : 'SEND MESSAGE'}
              </button>
            </form>
          )}
        </section>
      </div>
    </ContentPageShell>
  );
}
