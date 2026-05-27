import { useState } from 'react';
import ContentPageShell, { SignalList } from '../components/ContentPageShell';
import { AppLink } from '../components/RouterAdapter';
import { useTheme } from '../components/ThemeProvider';
import Turnstile from '../components/Turnstile';
import { usePageColor } from '../hooks/usePageColor';
import { apiPost, getTurnstileSiteKey } from '../lib/api';

const initialForm = {
  name: '',
  email: '',
  projectName: '',
  location: '',
  practice: '',
  format: '',
  links: '',
  notes: ''
}

export default function ArtistInterest() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState(initialForm);
  const [requestStatus, setRequestStatus] = useState('idle');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  usePageColor('#ff5bb8');

  async function handleSubmit(e) {
    e.preventDefault();
    setRequestStatus('loading');
    setErrorMessage('');

    try {
      await apiPost('/api/artist-interest', {
        action: 'create',
        name: formData.name,
        email: formData.email,
        projectName: formData.projectName,
        location: formData.location,
        practice: formData.practice,
        format: formData.format,
        links: formData.links,
        notes: formData.notes,
        turnstileToken,
      });

      setSubmitted(true);
      setRequestStatus('idle');
      setFormData(initialForm);
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    } catch (error) {
      console.error('Error submitting artist interest:', error);
      if (error.message.includes('not set up yet')) {
        setErrorMessage('This form is almost ready. We are finishing the database setup right now, so please try again shortly.');
      } else {
        setErrorMessage('Something went wrong while sending this through. Please try again.');
      }
      setRequestStatus('error');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    }
  }

  return (
    <ContentPageShell
      title="SHARE"
      color="#ff5bb8"
      introTitle="SHARE"
      introCopy="ARTIST INTEREST, PROGRAMMING NOTES, AND FUTURE COLLABORATION INTAKE"
      contentClassName="page-stack"
    >
      <div className="artist-interest-layout theme-split-layout">
        <section className="artist-interest-intro page-stack">
          <div className="page-panel">
            <p className="page-block-label">What this is</p>
            <p className="page-copy">
              This is not a formal application. It is a way to raise a hand and share the type of work you would be excited to bring into a LMNL context.
            </p>
          </div>
          <div className="page-panel">
            <p className="page-block-label">What to include</p>
            <SignalList
              items={[
                { label: 'Practice', meta: 'What you make and how you work' },
                { label: 'Links', meta: 'Portfolio, Instagram, SoundCloud, or site' },
                { label: 'Context', meta: 'Formats you would be open to sharing' },
              ]}
            />
          </div>
        </section>

        <section className="artist-interest-form-shell page-form-shell">
          {submitted ? (
            <div className="artist-interest-success theme-message-stack">
              <p className="artist-interest-success-label theme-kicker">Received</p>
              <h3 className="theme-title-md">Thanks for sharing your work.</h3>
              <p className="theme-body-copy">
                Your information is now in our programming queue, and we will reach out when there is a fit.
              </p>
              <div className="artist-interest-success-actions theme-action-row">
                <button
                  type="button"
                  className="artist-interest-button artist-interest-button-primary theme-button"
                  onClick={() => setSubmitted(false)}
                >
                  Submit another
                </button>
                <AppLink to="/community" className="artist-interest-button artist-interest-button-secondary theme-button">
                  Back to community
                </AppLink>
              </div>
            </div>
          ) : (
            <form className="artist-interest-form theme-form" onSubmit={handleSubmit}>
              <div className="artist-interest-grid page-form-grid">
                <label className="artist-interest-field theme-field">
                  <span className="theme-field-label">Name</span>
                  <input
                    className="theme-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                </label>

                <label className="artist-interest-field theme-field">
                  <span className="theme-field-label">Email</span>
                  <input
                    className="theme-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="artist-interest-field theme-field">
                  <span className="theme-field-label">Project or collective</span>
                  <input
                    className="theme-input"
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="Optional"
                  />
                </label>

                <label className="artist-interest-field theme-field">
                  <span className="theme-field-label">Location</span>
                  <input
                    className="theme-input"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, region, or remote"
                  />
                </label>

                <label className="artist-interest-field artist-interest-field-full theme-field is-full">
                  <span className="theme-field-label">Practice</span>
                  <input
                    className="theme-input"
                    type="text"
                    value={formData.practice}
                    onChange={(e) => setFormData({ ...formData, practice: e.target.value })}
                    placeholder="DJ, live set, visual art, installation, performance, film, curatorial work..."
                    required
                  />
                </label>

                <label className="artist-interest-field artist-interest-field-full theme-field is-full">
                  <span className="theme-field-label">What would you be open to sharing?</span>
                  <input
                    className="theme-input"
                    type="text"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    placeholder="Live performance, exhibition, listening session, screening, workshop, open format..."
                  />
                </label>

                <label className="artist-interest-field artist-interest-field-full theme-field is-full">
                  <span className="theme-field-label">Links</span>
                  <input
                    className="theme-input"
                    type="text"
                    value={formData.links}
                    onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                    placeholder="Website, Instagram, SoundCloud, portfolio, or anything helpful"
                  />
                </label>

                <label className="artist-interest-field artist-interest-field-full theme-field is-full">
                  <span className="theme-field-label">Tell us a little about the work</span>
                  <textarea
                    className="theme-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="What are you making right now, and what kind of LMNL context would feel exciting?"
                    rows={7}
                  />
                </label>
              </div>

              {requestStatus === 'error' && (
                <p className="artist-interest-error">{errorMessage}</p>
              )}

              <Turnstile
                siteKey={getTurnstileSiteKey()}
                onTokenChange={setTurnstileToken}
                resetSignal={turnstileResetSignal}
                theme={theme}
              />

              <div className="artist-interest-actions theme-action-row">
                <button
                  type="submit"
                  className="artist-interest-button artist-interest-button-primary theme-button"
                  disabled={requestStatus === 'loading' || !turnstileToken}
                >
                  {requestStatus === 'loading' ? 'Sending...' : 'Share your work'}
                </button>
                <p className="artist-interest-footnote">
                  We review these on an ongoing basis and reach out when there is alignment.
                </p>
              </div>
            </form>
          )}
        </section>
      </div>
    </ContentPageShell>
  );
}
