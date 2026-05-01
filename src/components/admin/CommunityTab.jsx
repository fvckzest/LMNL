import { Fragment, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArchiveIcon, TrashIcon, UnarchiveIcon } from './Icons';

export default function CommunityTab({
  events,
  communityCredits,
  communityLoading,
  communityTableMissing,
  fetchCommunityCredits,
  artistInterest,
  artistInterestLoading,
  artistInterestTableMissing,
  fetchArtistInterest,
  updateArtistInterestStatus,
  deleteArtistInterest,
  showToast,
  triggerConfirm
}) {
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [expandedCommunityEvents, setExpandedCommunityEvents] = useState({});
  const [expandedArtistInterest, setExpandedArtistInterest] = useState({});
  const [creditForm, setCreditForm] = useState({
    name: '',
    role: 'performer',
    event_id: '',
    details: '',
    link: ''
  });

  async function handleCreditSubmit(e) {
    e.preventDefault();
    if (!creditForm.name) return showToast('Name is required', 'error');

    let event_name = '';
    if (creditForm.event_id) {
      const matchedEvent = events.find(e => e.id === creditForm.event_id);
      if (matchedEvent) event_name = matchedEvent.name;
    }

    const data = {
      name: creditForm.name,
      role: creditForm.role,
      event_id: creditForm.event_id || null,
      event_name: event_name || null,
      details: creditForm.details || '',
      link: creditForm.link || ''
    };

    let error;
    if (editingCredit) {
      const { error: err } = await supabase.from('community_credits').update(data).eq('id', editingCredit.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('community_credits').insert([data]);
      error = err;
    }

    if (error) {
      showToast('Error saving credit: ' + error.message, 'error');
    } else {
      setIsCommunityModalOpen(false);
      fetchCommunityCredits();
      showToast('Credit saved successfully');
    }
  }

  async function deleteCredit(id) {
    triggerConfirm('Are you sure you want to delete this credit permanently?', async () => {
      const { error } = await supabase
        .from('community_credits')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting credit:', error);
        showToast('Failed to delete credit: ' + error.message, 'error');
      } else {
        fetchCommunityCredits();
        showToast('Credit deleted');
      }
    });
  }

  function openCommunityModal(credit = null) {
    if (credit) {
      setEditingCredit(credit);
      setCreditForm({
        name: credit.name,
        role: credit.role,
        event_id: credit.event_id || '',
        details: credit.details || '',
        link: credit.link || ''
      });
    } else {
      setEditingCredit(null);
      setCreditForm({
        name: '',
        role: 'performer',
        event_id: '',
        details: '',
        link: ''
      });
    }
    setIsCommunityModalOpen(true);
  }

  async function syncFromEvents() {
    let addedCount = 0;
    let skippedCount = 0;

    try {
      for (const event of events) {
        const performers = event.metadata?.performers 
          ? event.metadata.performers.split(',').map(s => s.trim()).filter(Boolean) 
          : [];
        const artists = event.metadata?.artists 
          ? event.metadata.artists.split(',').map(s => s.trim()).filter(Boolean) 
          : [];

        for (const name of performers) {
          const exists = communityCredits.some(c => 
            c.name.toLowerCase() === name.toLowerCase() && 
            c.role === 'performer' && 
            c.event_id === event.id
          );

          if (!exists) {
            const { error } = await supabase.from('community_credits').insert([{
              name,
              role: 'performer',
              event_id: event.id,
              event_name: event.name
            }]);
            if (error) throw error;
            addedCount++;
          } else {
            skippedCount++;
          }
        }

        for (const name of artists) {
          const exists = communityCredits.some(c => 
            c.name.toLowerCase() === name.toLowerCase() && 
            c.role === 'artist' && 
            c.event_id === event.id
          );

          if (!exists) {
            const { error } = await supabase.from('community_credits').insert([{
              name,
              role: 'artist',
              event_id: event.id,
              event_name: event.name
            }]);
            if (error) throw error;
            addedCount++;
          } else {
            skippedCount++;
          }
        }
      }

      showToast(`Sync complete. Added ${addedCount} credits. Skipped ${skippedCount} duplicates.`);
      fetchCommunityCredits();
    } catch (err) {
      console.error('Error syncing from events:', err);
      showToast('Error syncing: ' + err.message, 'error');
    }
  }

  function toggleArtistInterest(id) {
    setExpandedArtistInterest(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  function toggleCommunityEvent(eventKey) {
    setExpandedCommunityEvents(prev => ({
      ...prev,
      [eventKey]: !prev[eventKey]
    }));
  }

  const eventOrderLookup = events.reduce((acc, event, index) => {
    acc[event.id] = index;
    return acc;
  }, {});

  const groupedCommunityCredits = communityCredits.reduce((groups, credit) => {
    const eventKey = credit.event_id || `independent:${credit.event_name || 'none'}`;
    const eventLabel = credit.event_name || 'INDEPENDENT / NO EVENT';

    if (!groups[eventKey]) {
      groups[eventKey] = {
        key: eventKey,
        eventId: credit.event_id || null,
        eventName: eventLabel,
        credits: []
      };
    }

    groups[eventKey].credits.push(credit);
    return groups;
  }, {});

  const communityEventGroups = Object.values(groupedCommunityCredits).sort((a, b) => {
    const aOrder = a.eventId && eventOrderLookup[a.eventId] !== undefined ? eventOrderLookup[a.eventId] : Number.MAX_SAFE_INTEGER;
    const bOrder = b.eventId && eventOrderLookup[b.eventId] !== undefined ? eventOrderLookup[b.eventId] : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.eventName.localeCompare(b.eventName);
  });

  return (
    <>
      <section className="admin-section" style={{ '--active-tab-color': '#ff5bb8' }}>
        <div className="section-header-flex">
          <h2 className="section-title">COMMUNITY CREDITS (PERFORMERS & ARTISTS)</h2>
          {!communityTableMissing && (
            <div className="action-buttons">
              <button 
                className="admin-btn small" 
                onClick={syncFromEvents}
                style={{ marginRight: '10px' }}
              >
                SYNC FROM EVENTS
              </button>
              <button className="admin-btn approve" onClick={() => openCommunityModal()}>+ ADD CREDIT</button>
            </div>
          )}
        </div>

        {communityTableMissing ? (
          <div className="setup-guide">
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>DATABASE SETUP REQUIRED</h3>
            </div>
            <p>Please create the <code>community_credits</code> table in your Supabase SQL Editor.</p>
            <pre style={{ 
              background: '#111', 
              color: '#fff', 
              padding: '15px', 
              borderRadius: '4px', 
              textAlign: 'left',
              fontSize: '11px',
              overflowX: 'auto',
              marginTop: '10px',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
{`CREATE TABLE IF NOT EXISTS community_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'performer' or 'artist'
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_name TEXT,
    details TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE community_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON community_credits FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all access" ON community_credits FOR ALL USING (auth.role() = 'authenticated');`}
            </pre>
            <button className="admin-btn" onClick={fetchCommunityCredits}>REFRESH</button>
          </div>
        ) : (
          <div className="events-table-container admin-table-shell">
            {communityLoading ? (
              <p className="loading-text">RETRIEVING COMMUNITY CREDITS...</p>
            ) : communityCredits.length === 0 ? (
              <p className="loading-text">NO COMMUNITY CREDITS FOUND. CLICK "SYNC FROM EVENTS" OR ADD MANUALLY.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>EVENT</th>
                    <th>NAME</th>
                    <th>ROLE</th>
                    <th>LINK</th>
                    <th>DETAILS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {communityEventGroups.map((group) => {
                    const isExpanded = Boolean(expandedCommunityEvents[group.key]);

                    return (
                      <Fragment key={group.key}>
                        <tr className={isExpanded ? 'event-row-expanded' : ''}>
                          <td>
                            <button
                              type="button"
                              className={`community-event-toggle ${isExpanded ? 'expanded' : ''}`}
                              style={{ '--toggle-color': '#ff5bb8' }}
                              onClick={() => toggleCommunityEvent(group.key)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? `Collapse ${group.eventName}` : `Expand ${group.eventName}`}
                            >
                              <span className="admin-toggle-arrow community-event-toggle-arrow">▶</span>
                              <span>{group.eventName}</span>
                            </button>
                          </td>
                          <td className="community-group-summary">
                            {group.credits.length} {group.credits.length === 1 ? 'person' : 'people'}
                          </td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td className="community-group-summary">Click to view attendees</td>
                        </tr>
                        {isExpanded && group.credits.map((credit) => (
                          <tr key={credit.id} className="community-credit-row">
                            <td></td>
                            <td><strong>{credit.name}</strong></td>
                            <td>{credit.role.toUpperCase()}</td>
                            <td>
                              {credit.link ? (
                                <a href={credit.link} target="_blank" rel="noopener noreferrer" style={{ color: '#004ffa', textDecoration: 'underline' }}>
                                  VISIT
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {credit.details || '-'}
                            </td>
                            <td className="actions-cell">
                              <div className="actions-wrapper">
                                <div className="main-actions">
                                  <button className="admin-btn" onClick={() => openCommunityModal(credit)}>EDIT</button>
                                </div>
                                <div className="secondary-actions">
                                  <button
                                    className="icon-btn delete-btn"
                                    style={{ color: '#991b1b' }}
                                    title="Delete Credit"
                                    onClick={() => deleteCredit(credit.id)}
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section className="admin-section" style={{ '--active-tab-color': '#ff5bb8' }}>
        <div className="section-header-flex">
          <h2 className="section-title">ARTIST INTEREST</h2>
          {!artistInterestTableMissing && (
            <div className="action-buttons">
              <button className="admin-btn" onClick={fetchArtistInterest}>REFRESH</button>
            </div>
          )}
        </div>

        {artistInterestTableMissing ? (
          <div className="setup-guide">
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>DATABASE SETUP REQUIRED</h3>
            </div>
            <p>Please create the <code>artist_interest</code> table in your Supabase SQL Editor.</p>
            <pre style={{ 
              background: '#111', 
              color: '#fff', 
              padding: '15px', 
              borderRadius: '4px', 
              textAlign: 'left',
              fontSize: '11px',
              overflowX: 'auto',
              marginTop: '10px',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
{`CREATE TABLE IF NOT EXISTS artist_interest (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    project_name TEXT DEFAULT '',
    location TEXT DEFAULT '',
    practice TEXT NOT NULL,
    format TEXT DEFAULT '',
    links TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE artist_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert access" ON artist_interest FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated read access" ON artist_interest FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated all access" ON artist_interest FOR ALL USING (auth.role() = 'authenticated');`}
            </pre>
            <button className="admin-btn" onClick={fetchArtistInterest}>REFRESH</button>
          </div>
        ) : (
          <div className="events-table-container admin-table-shell">
            {artistInterestLoading ? (
              <p className="loading-text">RETRIEVING ARTIST INTEREST...</p>
            ) : artistInterest.length === 0 ? (
              <p className="loading-text">NO ARTIST INTEREST SUBMISSIONS YET.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>NAME</th>
                    <th>CONTACT</th>
                    <th>PRACTICE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {artistInterest.map((entry) => {
                    const isExpanded = Boolean(expandedArtistInterest[entry.id]);

                    return (
                      <Fragment key={entry.id}>
                        <tr className={`${isExpanded ? 'event-row-expanded' : ''} status-${entry.status || 'pending'}`}>
                          <td className="artist-interest-toggle-cell">
                            <button
                              type="button"
                              className={`artist-interest-toggle ${isExpanded ? 'expanded' : ''}`}
                              style={{ '--toggle-color': '#ff5bb8' }}
                              onClick={() => toggleArtistInterest(entry.id)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              <span className="admin-toggle-arrow artist-interest-toggle-arrow">▶</span>
                            </button>
                          </td>
                          <td><strong>{entry.name}</strong></td>
                          <td>{entry.email}</td>
                          <td>{entry.practice}</td>
                          <td className="actions-cell">
                            <div className="actions-wrapper">
                              <div className="main-actions">
                                {entry.status === 'pending' && (
                                  <button
                                    className="admin-btn approve"
                                    onClick={() => updateArtistInterestStatus(entry.id, 'reviewed')}
                                  >
                                    MARK REVIEWED
                                  </button>
                                )}
                                {entry.status === 'reviewed' && (
                                  <button
                                    className="admin-btn reset"
                                    onClick={() => updateArtistInterestStatus(entry.id, 'pending')}
                                  >
                                    RESET
                                  </button>
                                )}
                              </div>
                              <div className="secondary-actions">
                                {entry.status !== 'archived' ? (
                                  <button
                                    className="icon-btn archive-btn"
                                    title="Archive"
                                    onClick={() => updateArtistInterestStatus(entry.id, 'archived')}
                                  >
                                    <ArchiveIcon />
                                  </button>
                                ) : (
                                  <button
                                    className="icon-btn unarchive-btn"
                                    title="Unarchive"
                                    onClick={() => updateArtistInterestStatus(entry.id, 'pending')}
                                  >
                                    <UnarchiveIcon />
                                  </button>
                                )}
                                <button
                                  className="icon-btn delete-btn"
                                  style={{ color: '#991b1b' }}
                                  title="Delete Artist Interest"
                                  onClick={() => deleteArtistInterest(entry.id)}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="artist-interest-details-row">
                            <td colSpan="5">
                              <div className="artist-interest-details-panel">
                                <div className="artist-interest-details-grid">
                                  <div className="artist-interest-detail-block">
                                    <span className="artist-interest-detail-label">Submitted</span>
                                    <span>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '-'}</span>
                                  </div>
                                  <div className="artist-interest-detail-block">
                                    <span className="artist-interest-detail-label">Location</span>
                                    <span>{entry.location || '-'}</span>
                                  </div>
                                  <div className="artist-interest-detail-block">
                                    <span className="artist-interest-detail-label">Project or collective</span>
                                    <span>{entry.project_name || '-'}</span>
                                  </div>
                                  <div className="artist-interest-detail-block">
                                    <span className="artist-interest-detail-label">Open to sharing</span>
                                    <span>{entry.format || '-'}</span>
                                  </div>
                                  <div className="artist-interest-detail-block artist-interest-detail-block-wide">
                                    <span className="artist-interest-detail-label">Links</span>
                                    {entry.links ? (
                                      <a href={entry.links} target="_blank" rel="noopener noreferrer" className="artist-interest-detail-link">
                                        {entry.links}
                                      </a>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </div>
                                  <div className="artist-interest-detail-block artist-interest-detail-block-wide">
                                    <span className="artist-interest-detail-label">Tell us a little</span>
                                    <p className="artist-interest-detail-notes">{entry.notes || '-'}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* COMMUNITY MODAL */}
      {isCommunityModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{editingCredit ? 'EDIT COMMUNITY CREDIT' : 'NEW COMMUNITY CREDIT'}</h3>
              <button className="close-modal" onClick={() => setIsCommunityModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreditSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label>NAME</label>
                  <input required type="text" value={creditForm.name} onChange={e => setCreditForm({...creditForm, name: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label>ROLE</label>
                  <select value={creditForm.role} onChange={e => setCreditForm({...creditForm, role: e.target.value})}>
                    <option value="performer">PERFORMER</option>
                    <option value="artist">ARTIST / SHARED ART</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>LINK TO EVENT</label>
                  <select 
                    value={creditForm.event_id} 
                    onChange={e => setCreditForm({...creditForm, event_id: e.target.value})}
                  >
                    <option value="">-- NO EVENT (INDEPENDENT) --</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>WEBSITE / SOCIAL LINK</label>
                  <input type="text" placeholder="https://..." value={creditForm.link} onChange={e => setCreditForm({...creditForm, link: e.target.value})} />
                </div>

                <div className="form-group full">
                  <label>DETAILS / NOTES</label>
                  <textarea rows="3" placeholder="Art medium, background info, etc." value={creditForm.details} onChange={e => setCreditForm({...creditForm, details: e.target.value})} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="admin-btn approve wide">SAVE CREDIT</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
