import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import { apiGet, apiPost } from '../lib/api';
import { readCommunityProvider } from '../lib/communityProfile';
import { supabase } from '../lib/supabase';
import './AppHome.css';

function formatDate(value) {
  if (!value) {
    return 'Date pending';
  }

  return new Date(value).toLocaleDateString();
}

function formatPoints(value) {
  return `${Number(value || 0)} pts`;
}

function SummaryTile({ label, value, accent = false }) {
  return (
    <div className={`app-home-summary-tile ${accent ? 'is-accent' : ''}`}>
      <p className="app-home-summary-label">{label}</p>
      <p className="app-home-summary-value">{value}</p>
    </div>
  );
}

export default function AppHome({ session, profile }) {
  const navigate = useNavigate();
  const provider = useMemo(() => readCommunityProvider(session), [session]);
  const [status, setStatus] = useState('loading');
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const data = await apiGet('/api/app-dashboard', { auth: true });
        if (!cancelled) {
          setDashboard(data);
          setStatus('ready');
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) {
          setDashboard(null);
          setStatus('error');
          setError(loadError.message || 'Unable to load your LMNL dashboard.');
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/app/login', { replace: true });
  }

  async function handleClaim(sourceId) {
    if (!sourceId || claimingId) {
      return;
    }

    setClaimingId(sourceId);
    setError('');

    try {
      await apiPost('/api/attendance-claim', { sourceId }, { auth: true });
      const nextDashboard = await apiGet('/api/app-dashboard', { auth: true });
      setDashboard(nextDashboard);
      setStatus('ready');
    } catch (claimError) {
      setError(claimError.message || 'Unable to claim attendance right now.');
    } finally {
      setClaimingId('');
    }
  }

  const summary = dashboard?.summary || {
    totalVerifiedEvents: 0,
    totalPoints: 0,
    performerAppearances: 0,
    pendingClaims: 0,
  };
  const latestAttendance = dashboard?.latestAttendance || null;
  const history = dashboard?.history || [];
  const sharedAttendancePreview = dashboard?.sharedAttendancePreview || [];
  const pendingClaims = dashboard?.pendingClaims || [];

  return (
    <ContentPageShell title="APP" color="#00c2ff" contentClassName="app-home-content">
      <div className="app-home-layout">
        <section className="app-home-hero theme-panel">
          <div className="app-home-hero-copy">
            <p className="app-home-kicker">LMNL Dashboard</p>
            <h2 className="app-home-title">
              {profile?.display_name || 'LMNL Member'}
            </h2>
            <p className="app-home-copy">
              {summary.totalVerifiedEvents > 0
                ? 'Your attendance, proof, and overlap now live in one place.'
                : 'Your LMNL identity is active. The first verified event will turn this into a living record.'}
            </p>
          </div>

          <div className="app-home-hero-meta">
            <p>Profile: {profile?.profile_slug || 'pending'}</p>
            <p>Provider: {String(provider).toUpperCase()}</p>
            <p>Email: {session?.user?.email || 'No email returned'}</p>
          </div>

          <div className="app-home-actions">
            <button type="button" className="theme-button app-home-action" onClick={handleSignOut}>
              SIGN OUT
            </button>
          </div>
        </section>

        {status === 'loading' ? (
          <section className="app-home-panel theme-panel">
            <p className="app-home-panel-label">Loading</p>
            <h3 className="app-home-panel-title">Building your dashboard...</h3>
            <p className="app-home-panel-copy">We are resolving attendance, proof, and shared history.</p>
          </section>
        ) : null}

        {status === 'error' ? (
          <section className="app-home-panel theme-panel">
            <p className="app-home-panel-label">Dashboard unavailable</p>
            <h3 className="app-home-panel-title">Phase 2 data is not ready yet.</h3>
            <p className="app-home-panel-copy">{error}</p>
          </section>
        ) : null}

        {status === 'ready' ? (
          <>
            <section className="app-home-summary">
              <SummaryTile label="Verified events" value={summary.totalVerifiedEvents} accent />
              <SummaryTile label="Total points" value={summary.totalPoints} />
              <SummaryTile label="Performer appearances" value={summary.performerAppearances} />
              <SummaryTile label="Pending claims" value={summary.pendingClaims} />
            </section>

            <section className="app-home-grid">
              <article className="app-home-panel theme-panel app-home-panel-hero">
                <p className="app-home-panel-label">Latest proof</p>
                {latestAttendance ? (
                  <>
                    <h3 className="app-home-panel-title">{latestAttendance.artifact?.title || latestAttendance.eventName}</h3>
                    <p className="app-home-panel-copy">
                      {latestAttendance.artifact?.subtitle || `${latestAttendance.eventDateLabel} • Attendance proof`}
                    </p>
                    <div className="app-home-proof-row">
                      <span>{latestAttendance.participationTier}</span>
                      <span>{formatPoints(latestAttendance.pointsEarned)}</span>
                      <span>{latestAttendance.locationName || 'LMNL event'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="app-home-panel-title">Waiting on first verified event</h3>
                    <p className="app-home-panel-copy">
                      Once a ticket, invite claim, or staff confirmation resolves to your LMNL identity, the first proof artifact will land here.
                    </p>
                  </>
                )}
              </article>

              <article className="app-home-panel theme-panel">
                <p className="app-home-panel-label">Recent history</p>
                {history.length > 0 ? (
                  <div className="app-home-list">
                    {history.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="app-home-list-row">
                        <div>
                          <p className="app-home-list-title">{entry.eventName}</p>
                          <p className="app-home-list-meta">{entry.eventDateLabel}</p>
                        </div>
                        <div className="app-home-list-side">
                          <p>{entry.participationTier}</p>
                          <p>{formatPoints(entry.pointsEarned)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="app-home-panel-copy">
                    No verified attendance yet. The dashboard is ready for the first event proof.
                  </p>
                )}
              </article>

              <article className="app-home-panel theme-panel">
                <p className="app-home-panel-label">Shared attendance</p>
                {sharedAttendancePreview.length > 0 ? (
                  <div className="app-home-list">
                    {sharedAttendancePreview.map((entry) => (
                      <div key={entry.userId} className="app-home-list-row">
                        <div>
                          <p className="app-home-list-title">{entry.displayName}</p>
                          <p className="app-home-list-meta">
                            {entry.overlapCount} shared {entry.overlapCount === 1 ? 'event' : 'events'}
                          </p>
                        </div>
                        <div className="app-home-list-side">
                          <p>{entry.sharedEvents[0] || 'LMNL overlap'}</p>
                          <p>{formatDate(entry.latestVerifiedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="app-home-panel-copy">
                    Shared-space connections will appear here as verified attendance begins to overlap with other LMNL members.
                  </p>
                )}
              </article>

              <article className="app-home-panel theme-panel">
                <p className="app-home-panel-label">Pending claimable proof</p>
                {pendingClaims.length > 0 ? (
                  <div className="app-home-list">
                    {pendingClaims.map((claim) => (
                      <div key={claim.id} className="app-home-list-row is-claim">
                        <div>
                          <p className="app-home-list-title">{claim.eventName}</p>
                          <p className="app-home-list-meta">
                            {claim.eventDateLabel} • {claim.verificationMethod.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="theme-button app-home-claim-button"
                          disabled={Boolean(claimingId)}
                          onClick={() => handleClaim(claim.id)}
                        >
                          {claimingId === claim.id ? 'CLAIMING...' : 'CLAIM'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="app-home-panel-copy">
                    No unresolved proof is waiting on this account right now.
                  </p>
                )}
              </article>
            </section>

            {error ? (
              <section className="app-home-inline-error theme-panel">
                <p>{error}</p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </ContentPageShell>
  );
}
