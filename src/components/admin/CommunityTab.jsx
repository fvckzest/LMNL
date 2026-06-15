import { Fragment, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { normalizeCommunityCreditRole } from '../../lib/communityCredits';
import AdminSectionHeader from './AdminSectionHeader';
import { ArchiveToggleButton, DeleteActionButton } from './ActionButtons';

export default function CommunityTab({
  events,
  fetchEvents = () => {},
  communityCredits,
  communityLoading,
  communityTableMissing,
  fetchCommunityCredits,
  communityBusinesses = [],
  communityBusinessesLoading = false,
  communityBusinessesTableMissing = false,
  fetchCommunityBusinesses = () => {},
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
  emails = [],
  emailsLoading = false,
  emailsTableMissing = false,
  fetchEmails = () => {},
  updateArtistInterestStatus,
  deleteArtistInterest,
   showToast,
  triggerConfirm,
  pinnedSections = [],
  collapsedSections = [],
  onTogglePin = () => {},
  onToggleCollapse = () => {},
  renderMode = 'all'
}) {
  const sectionIds = {
    artist: 'artist_interest',
    credits: 'community_credits',
    businesses: 'community_businesses',
    mailing: 'emails'
  };

  const shouldRender = (sectionId) => {
    if (renderMode === 'all') return true;
    const isPinned = pinnedSections.includes(sectionId);
    if (renderMode === 'pinned') return isPinned;
    if (renderMode === 'unpinned') return !isPinned;
    return true;
  };
  const isCollapsed = (sectionId) => collapsedSections.includes(sectionId);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingEmailEntry, setEditingEmailEntry] = useState(null);
  const lastEmailSyncSignatureRef = useRef('');
  const [editingCredit, setEditingCredit] = useState(null);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [expandedCommunityEventKey, setExpandedCommunityEventKey] = useState(null);
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
  const [businessForm, setBusinessForm] = useState({
    name: '',
    link: '',
    details: ''
  });

  const [emailForm, setEmailForm] = useState({
    name: '',
    email: '',
    source: 'manual'
  });
  const normalizedCommunityCredits = communityCredits.map((credit) => ({
    ...credit,
    role: normalizeCommunityCreditRole(credit.role),
  }));

  function getMetadataKeyForRole(role) {
    if (role === 'performer') return 'performers';
    if (role === 'vendor') return 'vendors';
    return 'artists';
  }

  async function updateEventMetadataCredits(eventId, role, updater) {
    const event = events.find((entry) => entry.id === eventId);

    if (!event) {
      throw new Error('Linked event could not be found.');
    }

    const metadataKey = getMetadataKeyForRole(role);
    const currentValues = String(event.metadata?.[metadataKey] || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const nextValues = updater(currentValues);
    const nextMetadata = {
      ...(event.metadata || {}),
      [metadataKey]: nextValues.join(', '),
    };

    const { error } = await supabase
      .from('events')
      .update({ metadata: nextMetadata })
      .eq('id', eventId);

    if (error) {
      throw error;
    }
  }

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
      role: normalizeCommunityCreditRole(creditForm.role),
      event_id: creditForm.event_id || null,
      event_name: event_name || null,
      details: creditForm.details || '',
      link: creditForm.link || ''
    };

    let error;
    if (editingCredit?.isSynced === false && editingCredit?.event_id) {
      try {
        const originalRole = normalizeCommunityCreditRole(editingCredit.role);
        const normalizedOriginalName = String(editingCredit.name || '').trim().toLowerCase();

        await updateEventMetadataCredits(editingCredit.event_id, originalRole, (values) =>
          values.filter((value) => value.trim().toLowerCase() !== normalizedOriginalName)
        );

        await updateEventMetadataCredits(editingCredit.event_id, data.role, (values) => {
          const filteredValues = values.filter((value) => value.trim().toLowerCase() !== data.name.trim().toLowerCase());
          return [...filteredValues, data.name].filter(Boolean);
        });
        const { error: insertError } = await supabase.from('community_credits').insert([data]);
        error = insertError;
      } catch (err) {
        error = err;
      }
    } else if (editingCredit?.id) {
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
      setEditingCredit(null);
      fetchCommunityCredits();
      fetchEvents();
      showToast('Credit saved successfully');
    }
  }

  async function deleteCredit(credit) {
    if (!credit?.isSynced && credit?.event_id) {
      triggerConfirm('Remove this credit from the event lineup?', async () => {
        try {
          await updateEventMetadataCredits(credit.event_id, credit.role, (values) =>
            values.filter((value) => value.trim().toLowerCase() !== String(credit.name || '').trim().toLowerCase())
          );
          fetchEvents();
          showToast('Credit removed from event metadata');
        } catch (error) {
          showToast('Failed to remove credit: ' + error.message, 'error');
        }
      });
      return;
    }

    triggerConfirm('Are you sure you want to delete this credit permanently?', async () => {
      const { error } = await supabase
        .from('community_credits')
        .delete()
        .eq('id', credit.id);

      if (error) {
        console.error('Error deleting credit:', error);
        showToast('Failed to delete credit: ' + error.message, 'error');
      } else {
        fetchCommunityCredits();
        showToast('Credit deleted');
      }
    });
  }

  async function handleBusinessSubmit(e) {
    e.preventDefault();
    if (!businessForm.name) return showToast('Business name is required', 'error');

    const data = {
      name: businessForm.name,
      link: businessForm.link || '',
      details: businessForm.details || ''
    };

    let error;
    if (editingBusiness) {
      const { error: err } = await supabase.from('community_businesses').update(data).eq('id', editingBusiness.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('community_businesses').insert([data]);
      error = err;
    }

    if (error) {
      showToast('Error saving business: ' + error.message, 'error');
    } else {
      setIsBusinessModalOpen(false);
      fetchCommunityBusinesses();
      showToast('Business saved successfully');
    }
  }

  async function deleteBusiness(id) {
    triggerConfirm('Are you sure you want to delete this business permanently?', async () => {
      const { error } = await supabase
        .from('community_businesses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting business:', error);
        showToast('Failed to delete business: ' + error.message, 'error');
      } else {
        fetchCommunityBusinesses();
        showToast('Business deleted');
      }
    });
  }

  function openCommunityModal(credit = null) {
    if (credit) {
      setEditingCredit(credit);
      setCreditForm({
        name: credit.name,
        email: credit.email || '',
        role: normalizeCommunityCreditRole(credit.role),
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

  function openBusinessModal(business = null) {
    if (business) {
      setEditingBusiness(business);
      setBusinessForm({
        name: business.name || '',
        link: business.link || '',
        details: business.details || ''
      });
    } else {
      setEditingBusiness(null);
      setBusinessForm({
        name: '',
        link: '',
        details: ''
      });
    }
    setIsBusinessModalOpen(true);
  }

  function openEmailModal(entry = null) {
    if (entry) {
      setEditingEmailEntry(entry);
      setEmailForm({
        name: entry.name || '',
        email: entry.email,
        source: entry.source || 'manual'
      });
    } else {
      setEditingEmailEntry(null);
      setEmailForm({
        name: '',
        email: '',
        source: 'manual'
      });
    }
    setIsEmailModalOpen(true);
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!emailForm.email) return showToast('Email is required', 'error');

    const data = {
      name: emailForm.name,
      email: normalizeEmail(emailForm.email),
      source: emailForm.source || 'manual'
    };

    try {
      await apiPost('/api/emails', { id: editingEmailEntry?.id || null, ...data }, { auth: true });
      setIsEmailModalOpen(false);
      fetchEmails();
      showToast('Contact saved successfully');
    } catch (error) {
      showToast('Error saving contact: ' + error.message, 'error');
    }
  }

  async function deleteEmailEntry(id) {
    triggerConfirm('Delete this manual entry?', async () => {
      try {
        await apiPost('/api/emails', { action: 'delete', id }, { auth: true });
        fetchEmails();
        showToast('Contact removed');
      } catch (error) {
        showToast('Error deleting: ' + error.message, 'error');
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
          const exists = normalizedCommunityCredits.some(c => 
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
          const exists = normalizedCommunityCredits.some(c => 
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

        const vendors = event.metadata?.vendors
          ? event.metadata.vendors.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        for (const name of vendors) {
          const exists = normalizedCommunityCredits.some(c =>
            c.name.toLowerCase() === name.toLowerCase() &&
            c.role === 'vendor' &&
            c.event_id === event.id
          );

          if (!exists) {
            const { error } = await supabase.from('community_credits').insert([{
              name,
              role: 'vendor',
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
    setExpandedCommunityEventKey((prev) => (prev === eventKey ? null : eventKey));
    setExpandedCredits({});
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
    contactInquiries: 0,
    artistInterest: 0,
    communityCredits: 0,
    emails: 0
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
    
    if (entry.selected_services?.includes('general')) {
      contactSourceTotals.contactInquiries += 1;
      addContactEntry({
        email: entry.email,
        name: entry.name,
        source: 'Contact Inquiries',
        createdAt: entry.created_at
      });
    } else {
      contactSourceTotals.services += 1;
      addContactEntry({
        email: entry.email,
        name: entry.name,
        source: 'Service Inquiries',
        createdAt: entry.created_at
      });
    }
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

  normalizedCommunityCredits.forEach((entry) => {
    if (isPlaceholderEmail(entry.email)) return;
    contactSourceTotals.communityCredits += 1;
    addContactEntry({
      email: entry.email,
      name: entry.name,
      source: 'Community Credits',
      createdAt: entry.created_at
    });
  });

  emails.forEach((entry) => {
    if (isPlaceholderEmail(entry.email)) return;
    const entrySource = String(entry.source || '').trim();
    const isManualEntry = !entrySource || entrySource === 'manual';
    contactSourceTotals.emails += 1;
    addContactEntry({
      id: isManualEntry ? entry.id : null,
      email: entry.email,
      name: entry.name,
      source: isManualEntry ? 'Manual Entry' : entrySource,
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

  const aggregateEmailSyncEntries = emailContacts.map((contact) => ({
    email: contact.email,
    name: contact.names[0] || '',
    source: contact.sources.filter((source) => source !== 'Manual Entry').join(', ') || 'aggregate',
    sources: contact.sources.filter((source) => source !== 'Manual Entry'),
    recordCount: contact.recordCount,
    latestSeenAt: contact.latestCreatedAt || null
  }));

  const aggregateEmailSyncSignature = aggregateEmailSyncEntries
    .map((entry) => `${entry.email}:${entry.name}:${entry.source}:${entry.recordCount}:${entry.latestSeenAt || ''}`)
    .join('|');

  const getSourceColor = (source) => {
    switch(source) {
      case 'Access Requests': return '#004ffa';
      case 'Tickets': return '#004ffa';
      case 'Service Inquiries': return '#6222d8';
      case 'Contact Inquiries': return '#90e937';
      case 'Artist Interest': return '#ff5bb8';
      case 'Community Credits': return '#ff5bb8';
      case 'Manual Entry': return '#ff5bb8';
      default: return '#555';
    }
  };


  const contactListLoading =
    requestsLoading ||
    ticketsLoading ||
    servicesLoading ||
    artistInterestLoading ||
    communityLoading ||
    emailsLoading;
  const totalEmailRecords = Object.values(contactSourceTotals).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    if (contactListLoading || emailsTableMissing || aggregateEmailSyncEntries.length === 0) return;
    if (lastEmailSyncSignatureRef.current === aggregateEmailSyncSignature) return;

    lastEmailSyncSignatureRef.current = aggregateEmailSyncSignature;
    apiPost('/api/emails', { action: 'sync', entries: aggregateEmailSyncEntries }, { auth: true })
      .catch((error) => {
        console.error('Error syncing aggregate emails:', error);
      });
  }, [aggregateEmailSyncEntries, aggregateEmailSyncSignature, contactListLoading, emailsTableMissing]);

  const groupedCommunityCredits = normalizedCommunityCredits.reduce((groups, credit) => {
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

  const eventLookup = events.reduce((lookup, event) => {
    lookup[event.id] = event;
    return lookup;
  }, {});

  function getMetadataCreditsForRole(group, role) {
    const event = group.eventId ? eventLookup[group.eventId] : null;

    if (!event) return [];

    const metadataKey = role === 'performer'
      ? 'performers'
      : role === 'artist'
        ? 'artists'
        : 'vendors';

    return String(event.metadata?.[metadataKey] || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  events.forEach((event) => {
    const hasMetadataCredits = ['performer', 'artist', 'vendor'].some((role) =>
      getMetadataCreditsForRole({ eventId: event.id }, role).length > 0
    );

    if (!hasMetadataCredits || groupedCommunityCredits[event.id]) {
      return;
    }

    groupedCommunityCredits[event.id] = {
      key: event.id,
      eventId: event.id,
      eventName: event.name || 'UNTITLED EVENT',
      credits: []
    };
  });

  const communityEventGroups = Object.values(groupedCommunityCredits).sort((a, b) => {
    const aOrder = a.eventId && eventOrderLookup[a.eventId] !== undefined ? eventOrderLookup[a.eventId] : Number.MAX_SAFE_INTEGER;
    const bOrder = b.eventId && eventOrderLookup[b.eventId] !== undefined ? eventOrderLookup[b.eventId] : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.eventName.localeCompare(b.eventName);
  });

  function getCommunityGroupCount(group, role) {
    const normalizedNames = new Set(
      group.credits
        .filter((credit) => credit.role === role)
        .map((credit) => String(credit.name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    getMetadataCreditsForRole(group, role).forEach((name) => {
      normalizedNames.add(name.toLowerCase());
    });

    return normalizedNames.size;
  }

  function getCommunityGroupRows(group) {
    const rows = group.credits.map((credit) => ({
      ...credit,
      rowKey: String(credit.id),
      isSynced: true,
    }));
    const existingRoleNames = new Set(
      rows.map((row) => `${row.role}:${String(row.name || '').trim().toLowerCase()}`)
    );

    ['performer', 'artist', 'vendor'].forEach((role) => {
      getMetadataCreditsForRole(group, role).forEach((name) => {
        const normalizedName = name.toLowerCase();
        const key = `${role}:${normalizedName}`;

        if (existingRoleNames.has(key)) {
          return;
        }

        existingRoleNames.add(key);
        rows.push({
          id: null,
          name,
          email: '',
          role,
          event_id: group.eventId,
          event_name: group.eventName,
          details: '',
          link: '',
          rowKey: `meta:${group.key}:${role}:${normalizedName}`,
          isSynced: false,
        });
      });
    });

    return rows;
  }
  const activeArtistInterestCount = artistInterest.filter((entry) => entry.status !== 'archived').length;
  const businessCount = communityBusinesses.length;
  const creditCount = normalizedCommunityCredits.length;
  const contactCount = emailContacts.length;

  return (
     <>
      {shouldRender(sectionIds.artist) && (
      <section className="admin-section" style={{ '--active-tab-color': '#ff5bb8' }}>
        <div className="section-header-flex">
          <AdminSectionHeader
            title="ARTIST INTEREST"
            isPinned={pinnedSections.includes(sectionIds.artist)}
            onTogglePin={() => onTogglePin(sectionIds.artist)}
            isCollapsed={isCollapsed(sectionIds.artist)}
            onToggleCollapse={() => onToggleCollapse(sectionIds.artist)}
            collapsedCount={activeArtistInterestCount}
          />
          {!isCollapsed(sectionIds.artist) && !artistInterestTableMissing && (

            <div className="action-buttons">
              <button className="admin-btn" onClick={fetchArtistInterest}>REFRESH</button>
            </div>
          )}
        </div>

        {!isCollapsed(sectionIds.artist) && (artistInterestTableMissing ? (
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
              fontFamily: 'var(--lmnl-font-mono)'
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
                                <ArchiveToggleButton
                                  isArchived={entry.status === 'archived'}
                                  archiveTitle="Archive"
                                  unarchiveTitle="Unarchive"
                                  onArchive={() => updateArtistInterestStatus(entry.id, 'archived')}
                                  onUnarchive={() => updateArtistInterestStatus(entry.id, 'pending')}
                                />
                                <DeleteActionButton
                                  title="Delete Artist Interest"
                                  onClick={() => deleteArtistInterest(entry.id)}
                                />
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
        ))}
      </section>
      )}

      {shouldRender(sectionIds.businesses) && (
      <section className="admin-section" style={{ '--active-tab-color': '#ff5bb8' }}>
        <div className="section-header-flex">
          <AdminSectionHeader
            title="COMMUNITY BUSINESSES"
            isPinned={pinnedSections.includes(sectionIds.businesses)}
            onTogglePin={() => onTogglePin(sectionIds.businesses)}
            isCollapsed={isCollapsed(sectionIds.businesses)}
            onToggleCollapse={() => onToggleCollapse(sectionIds.businesses)}
            collapsedCount={businessCount}
          />

          {!isCollapsed(sectionIds.businesses) && !communityBusinessesTableMissing && (
            <div className="action-buttons">
              <button className="admin-btn approve" onClick={() => openBusinessModal()}>+ ADD BUSINESS</button>
            </div>
          )}
        </div>

        {!isCollapsed(sectionIds.businesses) && (communityBusinessesTableMissing ? (
          <div className="setup-guide">
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>DATABASE SETUP REQUIRED</h3>
            </div>
            <p>Please create the <code>community_businesses</code> table in your Supabase SQL Editor.</p>
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
              fontFamily: 'var(--lmnl-font-mono)'
            }}>
{`CREATE TABLE IF NOT EXISTS community_businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    link TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE community_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON community_businesses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all access" ON community_businesses FOR ALL USING (auth.role() = 'authenticated');`}
            </pre>
            <button className="admin-btn" onClick={fetchCommunityBusinesses}>REFRESH</button>
          </div>
        ) : (
          <div className="events-table-container admin-table-shell">
            {communityBusinessesLoading ? (
              <p className="loading-text">RETRIEVING COMMUNITY BUSINESSES...</p>
            ) : communityBusinesses.length === 0 ? (
              <p className="loading-text">NO COMMUNITY BUSINESSES FOUND YET. ADD ONE TO START BUILDING THIS LIST.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>BUSINESS</th>
                    <th>LINK</th>
                    <th>DETAILS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {communityBusinesses.map((business) => (
                    <tr key={business.id}>
                      <td><strong>{business.name}</strong></td>
                      <td>
                        {business.link ? (
                          <a href={business.link} target="_blank" rel="noopener noreferrer" className="event-name-link">
                            {business.link}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{business.details || '-'}</td>
                      <td className="actions-cell">
                        <div className="actions-wrapper">
                          <div className="main-actions">
                            <button className="admin-btn" onClick={() => openBusinessModal(business)}>EDIT</button>
                          </div>
                          <div className="secondary-actions">
                            <DeleteActionButton
                              title="Delete Business"
                              onClick={() => deleteBusiness(business.id)}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </section>
      )}

      {shouldRender(sectionIds.credits) && (
      <section className="admin-section" style={{ '--active-tab-color': '#ff5bb8' }}>
        <div className="section-header-flex">
          <AdminSectionHeader
            title="COMMUNITY CREDITS"
            isPinned={pinnedSections.includes(sectionIds.credits)}
            onTogglePin={() => onTogglePin(sectionIds.credits)}
            isCollapsed={isCollapsed(sectionIds.credits)}
            onToggleCollapse={() => onToggleCollapse(sectionIds.credits)}
            collapsedCount={creditCount}
          />

          {!isCollapsed(sectionIds.credits) && !communityTableMissing && (
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

        {!isCollapsed(sectionIds.credits) && (communityTableMissing ? (
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
              fontFamily: 'var(--lmnl-font-mono)'
            }}>
{`CREATE TABLE IF NOT EXISTS community_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    role TEXT NOT NULL, -- 'performer', 'artist', or 'vendor'
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
            ) : communityEventGroups.length === 0 ? (
              <p className="loading-text">NO COMMUNITY CREDITS FOUND. CLICK "SYNC FROM EVENTS" OR ADD MANUALLY.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>EVENT</th>
                    <th>PERFORMERS</th>
                    <th>ARTISTS</th>
                    <th>VENDORS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {communityEventGroups.map((group) => {
                    const isExpanded = expandedCommunityEventKey === group.key;
                    const groupRows = getCommunityGroupRows(group);
                    const performerCount = getCommunityGroupCount(group, 'performer');
                    const artistCount = getCommunityGroupCount(group, 'artist');
                    const vendorCount = getCommunityGroupCount(group, 'vendor');

                    return (
                      <Fragment key={group.key}>
                        <tr className={isExpanded ? 'event-row-expanded' : ''}>
                          <td 
                            className="community-event-name-cell"
                            colSpan={2}
                            style={{ verticalAlign: 'top', fontWeight: 700 }}
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
                              <span>{group.eventName}</span>
                            </button>
                          </td>
                          <td className="community-group-summary">{performerCount}</td>
                          <td className="community-group-summary">{artistCount}</td>
                          <td className="community-group-summary">{vendorCount}</td>
                          <td className="community-group-summary">Click to view credits</td>
                        </tr>
                        {isExpanded && (
                          <tr className="ticket-holders-row community-credits-row">
                            <td colSpan="6">
                              <div className="ticket-holders-panel community-credits-panel">
                                <div className="ticket-holders-header community-credits-header">
                                  <span>Community Credits</span>
                                </div>
                                <table className="admin-table inline-issued-tickets-table community-credits-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '1%', textAlign: 'center' }}></th>
                                      <th>NAME</th>
                                      <th>EMAIL</th>
                                      <th>ROLE</th>
                                      <th>ACTIONS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupRows.map((credit) => {
                                      const isCreditExpanded = Boolean(expandedCredits[credit.rowKey]);

                                      return (
                                        <Fragment key={credit.rowKey}>
                                          <tr className={`community-credit-row ${isCreditExpanded ? 'credit-row-expanded' : ''}`}>
                                            <td className="ticket-detail-toggle-cell">
                                              <button
                                                type="button"
                                                className={`ticket-detail-toggle ${isCreditExpanded ? 'expanded' : ''}`}
                                                onClick={() => toggleCreditExpansion(credit.rowKey)}
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
                                                  <DeleteActionButton
                                                    title="Delete Credit"
                                                    onClick={() => deleteCredit(credit)}
                                                  />
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
                                                      <p className="credit-metadata-value">
                                                        {credit.details || (credit.isSynced ? 'No additional details' : 'This entry is currently coming from the event metadata.')}
                                                      </p>
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
        ))}
      </section>
      )}

      {shouldRender(sectionIds.mailing) && (
      <section className="admin-section" style={{ '--active-tab-color': '#ff5bb8' }}>
        <AdminSectionHeader
          title="GENERAL CONTACT LIST"
          isPinned={pinnedSections.includes(sectionIds.mailing)}
          onTogglePin={() => onTogglePin(sectionIds.mailing)}
          isCollapsed={isCollapsed(sectionIds.mailing)}
          onToggleCollapse={() => onToggleCollapse(sectionIds.mailing)}
          collapsedCount={contactCount}
        />
        
        {!isCollapsed(sectionIds.mailing) && emailsTableMissing && (
          <div className="setup-guide" style={{ marginBottom: '20px' }}>
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>EMAILS TABLE REQUIRED</h3>
            </div>
            <p>Please create the <code>emails</code> table in your Supabase SQL Editor.</p>
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
              fontFamily: 'var(--lmnl-font-mono)'
            }}>
{`CREATE TABLE IF NOT EXISTS emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'manual',
    sources JSONB DEFAULT '[]'::jsonb,
    record_count INTEGER DEFAULT 1,
    latest_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE emails ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS record_count INTEGER DEFAULT 1;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS latest_seen_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emails_admin_only"
ON emails
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());`}
            </pre>
            <button className="admin-btn" onClick={fetchEmails}>REFRESH</button>
          </div>
        )}
        {!isCollapsed(sectionIds.mailing) && (
        <>
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
             <button className="admin-btn approve" onClick={() => openEmailModal()}>+ ADD MANUAL ENTRY</button>
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
                                const entry = emails.find(m => m.email === contact.email);
                                openEmailModal(entry || { email: contact.email, name: contact.names[0] });
                              }}
                            >
                              EDIT
                            </button>
                            <DeleteActionButton
                              title={contact.manualEntryId ? 'Delete Manual Entry' : 'Source records cannot be deleted from here'}
                              variant={contact.manualEntryId ? 'danger' : 'muted'}
                              onClick={() => {
                                if (contact.manualEntryId) {
                                  deleteEmailEntry(contact.manualEntryId);
                                } else {
                                  showToast('Only manual entries can be deleted from this view. Source records (tickets/requests) must be managed in their respective tabs.', 'error');
                                }
                              }}
                            />
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
                                        className="status-pill active contact-source-pill"
                                        style={{ fontSize: '9px', background: getSourceColor(source), borderRadius: '0px', padding: '2px 6px' }}
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
        </>
        )}
      </section>
      )}
      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{editingEmailEntry ? 'EDIT CONTACT' : 'ADD MANUAL CONTACT'}</h3>
              <button className="close-modal" onClick={() => setIsEmailModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleEmailSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label>NAME (OPTIONAL)</label>
                  <input
                    type="text"
                    value={emailForm.name}
                    onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                    placeholder="Full Name"
                  />
                </div>
                
                <div className="form-group full">
                  <label>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                
                <div className="form-group full">
                  <label>SOURCE</label>
                  <input
                    type="text"
                    value={emailForm.source}
                    onChange={(e) => setEmailForm({ ...emailForm, source: e.target.value })}
                    placeholder="e.g. manual, outreach, etc."
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="admin-btn approve wide">
                  {editingEmailEntry ? 'UPDATE CONTACT' : 'SAVE CONTACT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBusinessModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{editingBusiness ? 'EDIT COMMUNITY BUSINESS' : 'NEW COMMUNITY BUSINESS'}</h3>
              <button className="close-modal" onClick={() => setIsBusinessModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleBusinessSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label>BUSINESS NAME</label>
                  <input
                    required
                    type="text"
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label>WEBSITE / SOCIAL LINK</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={businessForm.link}
                    onChange={(e) => setBusinessForm({ ...businessForm, link: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label>DETAILS / NOTES</label>
                  <textarea
                    rows="3"
                    placeholder="What work did LMNL do with them?"
                    value={businessForm.details}
                    onChange={(e) => setBusinessForm({ ...businessForm, details: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="admin-btn approve wide">
                  {editingBusiness ? 'UPDATE BUSINESS' : 'SAVE BUSINESS'}
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
                    <option value="vendor">VENDOR / BUSINESS</option>
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
