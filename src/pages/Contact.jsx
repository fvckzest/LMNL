import { useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import SocialLinks from '../components/SocialLinks';
import Turnstile from '../components/Turnstile';
import { apiPost, getTurnstileSiteKey } from '../lib/api';
import './Contact.css';

export default function Contact() {
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
    <ContentPageShell title="CONTACT" color="#90e937">
      <div className="contact-layout">
        <section className="contact-info-section">
          <div className="contact-info-group">
            <span className="contact-info-label">GENERAL INQUIRIES</span>
            <a href="mailto:hi@lmnl.art" className="contact-info-value">hi@lmnl.art</a>
          </div>

          <div className="contact-info-group">
            <span className="contact-info-label">SOCIAL CHANNELS</span>
            <SocialLinks iconSize={24} />
          </div>

          <div className="contact-info-group">
            <span className="contact-info-label">LOCATION</span>
            <span className="contact-info-value">LOS ANGELES, CA</span>
          </div>
          
          <div className="contact-info-group" style={{ marginTop: 'var(--lmnl-space-8)' }}>
            <p style={{ fontSize: '13px', color: 'var(--lmnl-color-text-muted)', lineHeight: '1.6', maxWidth: '320px' }}>
              For service-specific inquiries, please use our <a href="/services" style={{ color: 'inherit' }}>Services</a> page to build a custom bundle.
            </p>
          </div>
        </section>

        <section className="contact-form-section">
          {status === 'success' ? (
            <div className="inquiry-success">
              <h3 className="success-title">TRANSMISSION RECEIVED.</h3>
              <p className="success-text">Thank you for reaching out. We will get back to you shortly.</p>
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
                  style={{ resize: 'none' }}
                />
              </div>

              <Turnstile
                siteKey={getTurnstileSiteKey()}
                onTokenChange={setTurnstileToken}
                resetSignal={turnstileResetSignal}
              />

              {status === 'error' && (
                <p style={{ color: '#ff0055', fontSize: '12px', margin: '0', fontFamily: 'var(--lmnl-font-mono)' }}>
                  {errorMessage.toUpperCase()}
                </p>
              )}

              <button
                type="submit"
                className="theme-button"
                disabled={status === 'loading' || !turnstileToken}
                style={{ '--theme-button-bg': 'var(--page-color)', '--theme-button-color': '#000', border: 'none', fontWeight: '700' }}
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
