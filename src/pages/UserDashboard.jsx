import { useEffect, useMemo, useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import { AppLink, AppNavigate, useAppLocation, useAppNavigate } from '../components/RouterAdapter';
import { apiGet, apiPost } from '../lib/api';
import {
  buildCommunityDashboardPath,
  COMMUNITY_ONBOARDING_PATH,
  readCommunityProvider,
} from '../lib/communityProfile';
import { supabase } from '../lib/supabase';

function formatDate(value) {
  if (!value) {
    return 'Date pending';
  }

  return new Date(value).toLocaleDateString();
}

function formatPoints(value) {
  return `${Number(value || 0)} pts`;
}

function getProfileLinks(profile) {
  const links = [
    { label: 'Website', href: profile?.website_url || '' },
    { label: 'X', href: profile?.x_url || '' },
    { label: 'Instagram', href: profile?.instagram_url || '' },
  ];

  return links.filter((entry) => entry.href);
}

function StatTile({ label, value, accent = false }) {
  return (
    <div className={`user-dashboard-stat ${accent ? 'is-accent' : ''}`}>
      <p className="user-dashboard-stat-label">{label}</p>
      <p className="user-dashboard-stat-value">{value}</p>
    </div>
  );
}

function EmptyPanel({ label, title, copy }) {
  return (
    <article className="user-dashboard-panel theme-panel theme-accent-panel">
      <p className="user-dashboard-panel-label">{label}</p>
      <h3 className="user-dashboard-panel-title">{title}</h3>
      <p className="user-dashboard-panel-copy">{copy}</p>
    </article>
  );
}

function readUserSlugFromPathname(pathname) {
  const match = String(pathname || '').match(/^\/dashboard\/([^/?#]+)/);
  if (!match) {
    return '';
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function UserDashboard({ session, profile, userSlug: userSlugProp }) {
  const location = useAppLocation();
  const userSlug = userSlugProp || readUserSlugFromPathname(location.pathname);
  const navigate = useAppNavigate();
  const provider = useMemo(() => readCommunityProvider(session), [session]);
  const canonicalPath = useMemo(
    () => buildCommunityDashboardPath(profile?.profile_slug),
    [profile?.profile_slug],
  );
  const onboardingPath = useMemo(
    () => `${COMMUNITY_ONBOARDING_PATH}?next=${encodeURIComponent(canonicalPath)}`,
    [canonicalPath],
  );
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

  if (!profile?.profile_slug) {
    return <AppNavigate to={onboardingPath} replace />;
  }

  if (userSlug !== profile.profile_slug) {
    return <AppNavigate to={canonicalPath} replace />;
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
  const profileLinks = getProfileLinks(profile);

  return (
    <ContentPageShell title="DASHBOARD" color="#00c2ff" contentClassName="user-dashboard-content">
      <div className="user-dashboard-layout theme-shell-section">
        <section className="user-dashboard-hero theme-panel theme-accent-panel">
          <div className="user-dashboard-hero-stats">
            <p className="user-dashboard-kicker">Stats</p>
            <div className="user-dashboard-hero-stat-grid">
              <StatTile label="Verified events" value={summary.totalVerifiedEvents} accent />
              <StatTile label="Total points" value={summary.totalPoints} />
              <StatTile label="Performer appearances" value={summary.performerAppearances} />
              <StatTile label="Pending claims" value={summary.pendingClaims} />
            </div>
          </div>

          <div className="user-dashboard-hero-copy">
            <p className="user-dashboard-kicker">LMNL Member Dashboard</p>
            <h2 className="user-dashboard-title">{profile?.display_name || 'LMNL Member'}</h2>
            {profileLinks.length ? (
              <div className="user-dashboard-link-list">
                {profileLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="user-dashboard-link-chip"
                  >
                    <span>{link.label}</span>
                    <strong>{link.href.replace(/^https?:\/\//i, '')}</strong>
                  </a>
                ))}
              </div>
            ) : (
              <p className="user-dashboard-copy">
                Add your website, X, and Instagram in Edit Identity to surface your profile links here.
              </p>
            )}
          </div>

          <div className="user-dashboard-hero-aside">
            <div className="user-dashboard-meta">
              <p><span>Path</span>{canonicalPath}</p>
              <p><span>Provider</span>{String(provider).toUpperCase()}</p>
              <p><span>Status</span>{summary.totalVerifiedEvents > 0 ? 'Active record' : 'Awaiting first proof'}</p>
            </div>

            <div className="user-dashboard-actions">
              <AppLink to={onboardingPath} className="theme-button user-dashboard-action">
                EDIT IDENTITY
              </AppLink>
              <button type="button" className="theme-button user-dashboard-action" onClick={handleSignOut}>
                SIGN OUT
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="user-dashboard-inline-error theme-panel">
            <p>{error}</p>
          </section>
        ) : null}

        {status === 'loading' ? (
          <EmptyPanel
            label="Loading"
            title="Building your dashboard..."
            copy="We are resolving attendance proof, points, and shared history."
          />
        ) : null}

        {status === 'error' ? (
          <EmptyPanel
            label="Dashboard unavailable"
            title="Phase 2 data is not ready yet."
            copy={error || 'The attendance layer could not be loaded for this account.'}
          />
        ) : null}

        {status === 'ready' ? (
          <>
            <section className="user-dashboard-grid">
              <article className="user-dashboard-panel user-dashboard-proof theme-panel theme-accent-panel">
                <p className="user-dashboard-panel-label">Latest attendance artifact</p>
                {latestAttendance ? (
                  <>
                    <h3 className="user-dashboard-panel-title">
                      {latestAttendance.artifact?.title || latestAttendance.eventName}
                    </h3>
                    <p className="user-dashboard-panel-copy">
                      {latestAttendance.artifact?.subtitle || `${latestAttendance.eventDateLabel} • Attendance proof`}
                    </p>
                    <div className="user-dashboard-proof-row">
                      <span>{latestAttendance.participationTier}</span>
                      <span>{formatPoints(latestAttendance.pointsEarned)}</span>
                      <span>{latestAttendance.locationName || 'LMNL event'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="user-dashboard-panel-title">Waiting on first verified event</h3>
                    <p className="user-dashboard-panel-copy">
                      Once a ticket, invite claim, or staff confirmation resolves to this LMNL identity, the
                      first proof artifact will land here.
                    </p>
                  </>
                )}
              </article>

              <article className="user-dashboard-panel theme-panel theme-accent-panel">
                <p className="user-dashboard-panel-label">Recent history</p>
                {history.length > 0 ? (
                  <div className="user-dashboard-list">
                    {history.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="user-dashboard-list-row">
                        <div>
                          <p className="user-dashboard-list-title">{entry.eventName}</p>
                          <p className="user-dashboard-list-meta">{entry.eventDateLabel}</p>
                        </div>
                        <div className="user-dashboard-list-side">
                          <p>{entry.participationTier}</p>
                          <p>{formatPoints(entry.pointsEarned)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="user-dashboard-panel-copy">
                    No verified attendance yet. The dashboard is ready for the first event proof.
                  </p>
                )}
              </article>

              <article className="user-dashboard-panel theme-panel theme-accent-panel">
                <p className="user-dashboard-panel-label">Shared attendance preview</p>
                {sharedAttendancePreview.length > 0 ? (
                  <div className="user-dashboard-list">
                    {sharedAttendancePreview.map((entry) => (
                      <div key={entry.userId} className="user-dashboard-list-row">
                        <div>
                          <p className="user-dashboard-list-title">{entry.displayName}</p>
                          <p className="user-dashboard-list-meta">
                            {entry.overlapCount} shared {entry.overlapCount === 1 ? 'event' : 'events'}
                          </p>
                        </div>
                        <div className="user-dashboard-list-side">
                          <p>{entry.sharedEvents[0] || 'LMNL overlap'}</p>
                          <p>{formatDate(entry.latestVerifiedAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="user-dashboard-panel-copy">
                    Shared-space connections will appear here as verified attendance begins to overlap with other
                    LMNL members.
                  </p>
                )}
              </article>

              <article className="user-dashboard-panel theme-panel theme-accent-panel">
                <p className="user-dashboard-panel-label">Access and claim state</p>
                {pendingClaims.length > 0 ? (
                  <div className="user-dashboard-list">
                    {pendingClaims.map((claim) => (
                      <div key={claim.id} className="user-dashboard-list-row is-claim">
                        <div>
                          <p className="user-dashboard-list-title">{claim.eventName}</p>
                          <p className="user-dashboard-list-meta">
                            {claim.eventDateLabel} • {claim.verificationMethod.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="theme-button user-dashboard-claim-button"
                          disabled={Boolean(claimingId)}
                          onClick={() => handleClaim(claim.id)}
                        >
                          {claimingId === claim.id ? 'CLAIMING...' : 'CLAIM'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="user-dashboard-panel-copy">
                    No unresolved proof is waiting on this account right now.
                  </p>
                )}
              </article>
            </section>
          </>
        ) : null}
      </div>
    </ContentPageShell>
  );
}
