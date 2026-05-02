import { Fragment, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArchiveIcon, TrashIcon, UnarchiveIcon } from './Icons';

export default function CommunityTab({
  events,
  communityCredits,
  communityLoading,
  communityTableMissing,
  fetchCommunityCredits,
  requests,
  requestsLoading,
  tickets,
  ticketsLoading,
  serviceInquiries,
  servicesLoading,
  artistInterest,
  artistInterestLoading,
  artistInterestTableMissing,
  fetchArtistInterest,
  mailingList = [],
  mailingListLoading = false,
  mailingListTableMissing = false,
  fetchMailingList,
  updateArtistInterestStatus,
  deleteArtistInterest,
  showToast,
  triggerConfirm
}) {
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isMailingListModalOpen, setIsMailingListModalOpen] = useState(false);
  const [editingMailingEntry, setEditingMailingEntry] = useState(null);
  const [editingCredit, setEditingCredit] = useState(null);
  const [expandedCommunityEvents, setExpandedCommunityEvents] = useState({});
  const [expandedArtistInterest, setExpandedArtistInterest] = useState({});
  const [expandedCredits, setExpandedCredits] = useState({});
  const [expandedContacts, setExpandedContacts] = useState({});
  const [creditForm, setCreditForm] = useState({
    name: '',
    email: '',
    role: 'performer',
    event_id: '',
    details: '',
    link: ''
  });

  const [mailingForm, setMailingForm] = useState({
    name: '',
    email: '',
    source: 'manual'
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
      email: creditForm.email || '',
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
        email: credit.email || '',
        role: credit.role,
        event_id: credit.event_id || '',
        details: credit.details || '',
        link: credit.link || ''
      });
    } else {
      setEditingCredit(null);
      setCreditForm({
        name: '',
        email: '',
        role: 'performer',
        event_id: '',
        details: '',
        link: ''
      });
    }
    setIsCommunityModalOpen(true);
  }

  function openMailingListModal(entry = null) {
    if (entry) {
      setEditingMailingEntry(entry);
      setMailingForm({
        name: entry.name || '',
        email: entry.email,
        source: entry.source || 'manual'
      });
    } else {
      setEditingMailingEntry(null);
      setMailingForm({
        name: '',
        email: '',
        source: 'manual'
      });
    }
    setIsMailingListModalOpen(true);
  }

  async function handleMailingListSubmit(e) {
    e.preventDefault();
    if (!mailingForm.email) return showToast('Email is required', 'error');

    const data = {
      name: mailingForm.name,
      email: normalizeEmail(mailingForm.email),
      source: mailingForm.source || 'manual'
    };

    let error;
    if (editingMailingEntry) {
      const { error: err } = await supabase.from('mailing_list').update(data).eq('id', editingMailingEntry.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('mailing_list').insert([data]);
      error = err;
    }

    if (error) {
      showToast('Error saving contact: ' + error.message, 'error');
    } else {
      setIsMailingListModalOpen(false);
      fetchMailingList();
      showToast('Contact saved successfully');
    }
  }

  async function deleteMailingEntry(id) {
    triggerConfirm('Delete this manual entry?', async () => {
      const { error } = await supabase.from('mailing_list').delete().eq('id', id);
      if (error) {
        showToast('Error deleting: ' + error.message, 'error');
      } else {
        fetchMailingList();
        showToast('Contact removed');
      }
    });
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

  function toggleCreditExpansion(creditId) {
    setExpandedCredits(prev => ({
      ...prev,
      [creditId]: !prev[creditId]
    }));
  }

  function toggleContactExpansion(email) {
    setExpandedContacts(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  }

  const eventOrderLookup = events.reduce((acc, event, index) => {
    acc[event.id] = index;
    return acc;
  }, {});

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isPlaceholderEmail(email) {
    const normalized = normalizeEmail(email);
    return !normalized || normalized.endsWith('@example.com');
  }

  const emailContactsByEmail = new Map();
  const contactSourceTotals = {
    requests: 0,
    tickets: 0,
    services: 0,
    artistInterest: 0,
    communityCredits: 0,
    mailingList: 0
  };

  function addContactEntry({
    id,
    email,
    name,
    source,
    createdAt
  }) {
    const normalizedEmail = normalizeEmail(email);
    if (isPlaceholderEmail(normalizedEmail)) return;

    const existing = emailContactsByEmail.get(normalizedEmail);
    const safeName = String(name || '').trim();

    if (!existing) {
      emailContactsByEmail.set(normalizedEmail, {
        email: normalizedEmail,
        names: safeName ? [safeName] : [],
        sources: [source],
        recordCount: 1,
        latestCreatedAt: createdAt || null,
        manualEntryId: source === 'Manual Entry' ? id : null
      });
      return;
    }

    if (safeName && !existing.names.includes(safeName)) {
      existing.names.push(safeName);
    }

    if (!existing.sources.includes(source)) {
      existing.sources.push(source);
    }

    if (source === 'Manual Entry' && id) {
      existing.manualEntryId = id;
    }

    existing.recordCount += 1;

    if (createdAt && (!existing.latestCreatedAt || new Date(createdAt) > new Date(existing.latestCreatedAt))) {
      existing.latestCreatedAt = createdAt;
    }
  }

  requests.forEach((entry) => {
    if (isPlaceholderEmail(entry.customer_email)) return;
    contactSourceTotals.requests += 1;
    addContactEntry({
      email: entry.customer_email,
      name: entry.customer_name,
      source: 'Access Requests',
      createdAt: entry.created_at
    });
  });

  tickets.forEach((entry) => {
    if (isPlaceholderEmail(entry.customer_email)) return;
    contactSourceTotals.tickets += 1;
    addContactEntry({
      email: entry.customer_email,
      name: entry.customer_name,
      source: 'Tickets',
      createdAt: entry.created_at
    });
  });

  serviceInquiries.forEach((entry) => {
    if (isPlaceholderEmail(entry.email)) return;
    contactSourceTotals.services += 1;
    addContactEntry({
      email: entry.email,
      name: entry.name,
      source: 'Service Inquiries',
      createdAt: entry.created_at
    });
  });

  artistInterest.forEach((entry) => {
    if (isPlaceholderEmail(entry.email)) return;
    contactSourceTotals.artistInterest += 1;
    addContactEntry({
      email: entry.email,
      name: entry.name,
      source: 'Artist Interest',
      createdAt: entry.created_at
    });
  });

  communityCredits.forEach((entry) => {
    if (isPlaceholderEmail(entry.email)) return;
    contactSourceTotals.communityCredits += 1;
    addContactEntry({
      email: entry.email,
      name: entry.name,
      source: 'Community Credits',
      createdAt: entry.created_at
    });
  });

  mailingList.forEach((entry) => {
    if (isPlaceholderEmail(entry.email)) return;
    contactSourceTotals.mailingList += 1;
    addContactEntry({
      id: entry.id,
      email: entry.email,
      name: entry.name,
      source: 'Manual Entry',
      createdAt: entry.created_at
    });
  });

  const emailContacts = Array.from(emailContactsByEmail.values()).sort((a, b) => {
    if (a.latestCreatedAt && b.latestCreatedAt) {
      return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt);
    }
    if (a.latestCreatedAt) return -1;
    if (b.latestCreatedAt) return 1;
    return a.email.localeCompare(b.email);
  });

  const contactListLoading =
    requestsLoading ||
    ticketsLoading ||
    servicesLoading ||
    artistInterestLoading ||
    communityLoading ||
    mailingListLoading;
  const totalEmailRecords = Object.values(contactSourceTotals).reduce((sum, count) => sum + count, 0);

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
                        <tr className={`${isExpanded ? 'artist-row-expanded' : ''} status-${entry.status || 'pending'}`}>
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
                            <td></td>
                            <td colSpan="4">
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
                                  <div className="artist-interest-detail-block">
                                    <span className="artist-interest-detail-label">Links</span>
                                    {entry.links ? (
                                      <a href={entry.links} target="_blank" rel="noopener noreferrer" className="artist-interest-detail-link">
                                        {entry.links}
                                      </a>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </div>
                                  <div className="artist-interest-detail-block">
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
    email TEXT DEFAULT '',
    role TEXT NOT NULL, -- 'performer' or 'artist'
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_name TEXT,
    details TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE community_credits
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

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
                    <th></th>
                    <th>EVENT</th>
                    <th></th>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {communityEventGroups.map((group) => {
                    const isExpanded = Boolean(expandedCommunityEvents[group.key]);
                    
                    // Calculate total rows for rowSpan: 
                    // 1 (header) + credits.length + any expanded credit details
                    const expandedCount = isExpanded 
                      ? group.credits.filter(c => expandedCredits[c.id]).length 
                      : 0;
                    const totalRows = 1 + (isExpanded ? group.credits.length + expandedCount : 0);

                    return (
                      <Fragment key={group.key}>
                        <tr className={isExpanded ? 'event-row-expanded' : ''}>
                          <td 
                            className="community-event-arrow-cell"
                            rowSpan={totalRows} 
                            style={{ verticalAlign: 'middle' }}
                          >
                            <button
                              type="button"
                              className={`community-event-toggle ${isExpanded ? 'expanded' : ''}`}
                              style={{ '--toggle-color': '#ff5bb8' }}
                              onClick={() => toggleCommunityEvent(group.key)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? `Collapse ${group.eventName}` : `Expand ${group.eventName}`}
                            >
                              <span className="admin-toggle-arrow community-event-toggle-arrow">▶</span>
                            </button>
                          </td>
                          <td 
                            className="community-event-name-cell"
                            rowSpan={totalRows} 
                            style={{ verticalAlign: 'middle', fontWeight: 700 }}
                          >
                            {group.eventName}
                          </td>
                          <td className="community-group-summary">
                            {group.credits.length} {group.credits.length === 1 ? 'person' : 'people'}
                          </td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td className="community-group-summary">Click to view attendees</td>
                        </tr>
                        {isExpanded && group.credits.map((credit) => {
                          const isCreditExpanded = Boolean(expandedCredits[credit.id]);
                          return (
                            <Fragment key={credit.id}>
                              <tr className={`community-credit-row ${isCreditExpanded ? 'credit-row-expanded' : ''}`}>
                                <td className="ticket-detail-toggle-cell">
                                  <button
                                    type="button"
                                    className={`ticket-detail-toggle ${isCreditExpanded ? 'expanded' : ''}`}
                                    onClick={() => toggleCreditExpansion(credit.id)}
                                    aria-expanded={isCreditExpanded}
                                    title={isCreditExpanded ? 'Hide details' : 'Show details'}
                                    style={{ '--004ffa': '#ff5bb8' }} 
                                  >
                                    <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#ff5bb8' }}>▶</span>
                                  </button>
                                </td>
                                <td><strong>{credit.name}</strong></td>
                                <td>{credit.email || '-'}</td>
                                <td>{credit.role.toUpperCase()}</td>
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
                              {isCreditExpanded && (
                                <tr className="credit-metadata-row">
                                  <td colSpan="5">
                                    <div className="credit-metadata-panel">
                                      <div className="credit-metadata-grid">
                                        <div className="credit-metadata-item">
                                          <span className="credit-metadata-label">LINK</span>
                                          {credit.link ? (
                                            <a href={credit.link} target="_blank" rel="noopener noreferrer" className="credit-metadata-link">
                                              {credit.link}
                                            </a>
                                          ) : (
                                            <span className="credit-metadata-value" style={{ color: '#999' }}>No link provided</span>
                                          )}
                                        </div>
                                        <div className="credit-metadata-item">
                                          <span className="credit-metadata-label">DETAILS</span>
                                          <p className="credit-metadata-value">{credit.details || 'No additional details'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
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
          <h2 className="section-title">GENERAL CONTACT LIST</h2>
        </div>
        
        {mailingListTableMissing && (
          <div className="setup-guide" style={{ marginBottom: '20px' }}>
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>MAILING LIST TABLE REQUIRED</h3>
            </div>
            <p>Please create the <code>mailing_list</code> table in your Supabase SQL Editor.</p>
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
{`CREATE TABLE IF NOT EXISTS mailing_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access" ON mailing_list FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated all access" ON mailing_list FOR ALL USING (auth.role() = 'authenticated');`}
            </pre>
            <button className="admin-btn" onClick={fetchMailingList}>REFRESH</button>
          </div>
        )}
        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-label">UNIQUE EMAILS</span>
            <span className="stat-value">{emailContacts.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">TOTAL EMAIL RECORDS</span>
            <span className="stat-value">{totalEmailRecords}</span>
          </div>
          <div className="stat-item toggle-archived">
             <button className="admin-btn approve" onClick={() => openMailingListModal()}>+ ADD MANUAL ENTRY</button>
          </div>
        </div>

        <div className="events-table-container admin-table-shell">
          {contactListLoading ? (
            <p className="loading-text">BUILDING CONTACT LIST...</p>
          ) : emailContacts.length === 0 ? (
            <p className="loading-text">NO EMAIL CONTACTS FOUND YET.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>EMAIL</th>
                  <th>LATEST ENTRY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {emailContacts.map((contact) => {
                  const isExpanded = Boolean(expandedContacts[contact.email]);
                  return (
                    <Fragment key={contact.email}>
                      <tr className={isExpanded ? 'contact-row-expanded' : ''}>
                        <td className="ticket-detail-toggle-cell">
                          <button
                            type="button"
                            className={`ticket-detail-toggle ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleContactExpansion(contact.email)}
                            aria-expanded={isExpanded}
                            title={isExpanded ? 'Hide details' : 'Show details'}
                            style={{ '--004ffa': '#ff5bb8' }} 
                          >
                            <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#ff5bb8' }}>▶</span>
                          </button>
                        </td>
                        <td>
                          <a
                            href={`mailto:${contact.email}`}
                            className="event-name-link"
                          >
                            {contact.email}
                          </a>
                        </td>
                        <td>{contact.latestCreatedAt ? new Date(contact.latestCreatedAt).toLocaleDateString() : '-'}</td>
                        <td className="actions-cell">
                          <div className="actions-wrapper">
                            <button 
                              className="admin-btn small" 
                              onClick={() => {
                                const entry = mailingList.find(m => m.email === contact.email);
                                openMailingListModal(entry || { email: contact.email, name: contact.names[0] });
                              }}
                            >
                              EDIT
                            </button>
                            <button 
                              className="icon-btn delete-btn" 
                              style={{ color: contact.manualEntryId ? '#991b1b' : '#444' }}
                              title={contact.manualEntryId ? "Delete Manual Entry" : "Source records cannot be deleted from here"}
                              onClick={() => {
                                if (contact.manualEntryId) {
                                  deleteMailingEntry(contact.manualEntryId);
                                } else {
                                  showToast('Only manual entries can be deleted from this view. Source records (tickets/requests) must be managed in their respective tabs.', 'error');
                                }
                              }}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="contact-metadata-row">
                          <td></td>
                          <td colSpan="3">
                            <div className="contact-metadata-panel" style={{ padding: '15px 0', borderLeft: '2px solid #ff5bb8' }}>
                              <div className="contact-metadata-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', paddingLeft: '15px' }}>
                                <div className="contact-metadata-item">
                                  <span className="contact-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px' }}>KNOWN NAMES</span>
                                  <span className="contact-metadata-value" style={{ fontWeight: 600 }}>{contact.names.join(', ') || '-'}</span>
                                </div>
                                <div className="contact-metadata-item">
                                  <span className="contact-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px' }}>RECORDS FOUND</span>
                                  <span className="contact-metadata-value" style={{ fontWeight: 600 }}>{contact.recordCount}</span>
                                </div>
                                <div className="contact-metadata-item">
                                  <span className="contact-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px' }}>SOURCES</span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {contact.sources.map((source) => (
                                      <span
                                        key={`${contact.email}-${source}`}
                                        className="status-pill active"
                                        style={{ fontSize: '9px', background: '#ff5bb8', color: '#ffffff', borderRadius: '0px', padding: '2px 6px' }}
                                      >
                                        {source.toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
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
      </section>

      {/* Mailing List Modal */}
      {isMailingListModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2 className="modal-title">{editingMailingEntry ? 'EDIT CONTACT' : 'ADD MANUAL CONTACT'}</h2>
            <form onSubmit={handleMailingListSubmit}>
              <div className="form-group">
                <label>NAME (OPTIONAL)</label>
                <input
                  type="text"
                  value={mailingForm.name}
                  onChange={(e) => setMailingForm({ ...mailingForm, name: e.target.value })}
                  placeholder="Full Name"
                />
              </div>
              <div className="form-group">
                <label>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={mailingForm.email}
                  onChange={(e) => setMailingForm({ ...mailingForm, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>SOURCE</label>
                <input
                  type="text"
                  value={mailingForm.source}
                  onChange={(e) => setMailingForm({ ...mailingForm, source: e.target.value })}
                  placeholder="e.g. manual, outreach, etc."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="admin-btn cancel" onClick={() => setIsMailingListModalOpen(false)}>
                  CANCEL
                </button>
                <button type="submit" className="admin-btn approve">
                  {editingMailingEntry ? 'UPDATE CONTACT' : 'SAVE CONTACT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

                <div className="form-group full">
                  <label>CONTACT EMAIL</label>
                  <input type="email" placeholder="artist@example.com" value={creditForm.email} onChange={e => setCreditForm({...creditForm, email: e.target.value})} />
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
