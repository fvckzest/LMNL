import { Fragment, useEffect, useMemo, useState } from 'react';
import { apiPost } from '../../lib/api';
import { LinkIcon, TicketIcon } from './Icons';
import AdminSectionHeader from './AdminSectionHeader';
import { ArchiveToggleButton, DeleteActionButton } from './ActionButtons';

const MANAGED_METADATA_KEYS = new Set([
  'event_link',
  'performers',
  'artists',
  'vendors',
  'is_featured',
  'is_home_notif',
  'wallet_strip_image_url',
  'wallet_logo_text',
  'wallet_description',
  'wallet_primary_override',
  'wallet_coordinates',
  'wallet_location_override',
  'wallet_latitude',
  'wallet_longitude',
  'wallet_background_color',
  'wallet_foreground_color',
  'wallet_label_color',
  'wallet_notes',
  'wallet_relevant_dates',
  'wallet_expiration_date',
  'wallet_time_zone',
]);

 export default function EventsTab({
   events,
   tickets,
   eventLoading,
   ticketsLoading,
   tableMissing,
   squareItems,
   fetchingCatalog,
   squareError,
   fetchEvents,
   fetchTickets,
   fetchRequests,
   showToast,
   triggerConfirm,
   fetchSquareCatalog,
   requests,
   loading,
   updateStatus,
   deleteRequest,
   pinnedSections = [],
   collapsedSections = [],
   onTogglePin = () => {},
   onToggleCollapse = () => {},
   renderMode = 'all' // 'all', 'pinned', 'unpinned'
 }) {
   const sectionIds = {
     mgmt: 'events_mgmt',
     reqs: 'invite_reqs'
   };

   const shouldRender = (sectionId) => {
     if (renderMode === 'all') return true;
     const isPinned = pinnedSections.includes(sectionId);
     if (renderMode === 'pinned') return isPinned;
     if (renderMode === 'unpinned') return !isPinned;
     return true;
   };
   const isCollapsed = (sectionId) => collapsedSections.includes(sectionId);
  const [showArchivedEvents, setShowArchivedEvents] = useState(false);
  const [showArchivedRequests, setShowArchivedRequests] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newTraitKey, setNewTraitKey] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [expandedTicketIds, setExpandedTicketIds] = useState({});
  const activeEventCount = events.filter((event) => event.status !== 'archived').length;
  const activeRequestCount = requests.filter((request) => !request.is_archived).length;

  const [eventForm, setEventForm] = useState({
    name: '',
    price: '',
    event_date: '',
    event_time: '',
    location_name: '',
    address: '',
    description: '',
    capacity: '',
    image_url: '',
    partiful_url: '',
    is_private: true,
    status: 'active',
    square_variation_id: '',
    metadata: {}
  });

  async function updateEventStatus(id, newStatus) {
    try {
      await apiPost('/api/events', { action: 'update-status', id, status: newStatus }, { auth: true });
      fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      showToast('Failed to update event status: ' + error.message, 'error');
    }
  }

  async function deleteEvent(id) {
    triggerConfirm('Are you sure you want to delete this event permanently?', async () => {
      try {
        await apiPost('/api/events', { action: 'delete', id }, { auth: true });
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Failed to delete event: ' + error.message, 'error');
      }
    });
  }

  async function toggleHighlightEvent(targetEvent) {
    const updatedMetadata = {
      ...(targetEvent.metadata || {}),
      is_featured: !targetEvent.metadata?.is_featured
    };

    if (updatedMetadata.is_featured) {
      await apiPost('/api/events', {
        action: 'update-metadata',
        id: targetEvent.id,
        metadata: updatedMetadata,
      }, { auth: true });

      const others = events.filter(e => e.id !== targetEvent.id && e.metadata?.is_featured);
      for (const other of others) {
        const otherMeta = { ...other.metadata };
        delete otherMeta.is_featured;
        await apiPost('/api/events', {
          action: 'update-metadata',
          id: other.id,
          metadata: otherMeta,
        }, { auth: true });
      }
    } else {
      const clearedMeta = { ...(targetEvent.metadata || {}) };
      delete clearedMeta.is_featured;
      await apiPost('/api/events', {
        action: 'update-metadata',
        id: targetEvent.id,
        metadata: clearedMeta,
      }, { auth: true });
    }

    fetchEvents();
    showToast('Upcoming event selection updated.', 'success');
  }

  async function toggleHomeNotification(targetEvent) {
    const updatedMetadata = {
      ...(targetEvent.metadata || {}),
      is_home_notif: !targetEvent.metadata?.is_home_notif
    };

    if (updatedMetadata.is_home_notif) {
      await apiPost('/api/events', {
        action: 'update-metadata',
        id: targetEvent.id,
        metadata: updatedMetadata,
      }, { auth: true });

      // Unset others
      const others = events.filter(e => e.id !== targetEvent.id && e.metadata?.is_home_notif);
      for (const other of others) {
        const otherMeta = { ...other.metadata };
        delete otherMeta.is_home_notif;
        await apiPost('/api/events', {
          action: 'update-metadata',
          id: other.id,
          metadata: otherMeta,
        }, { auth: true });
      }
    } else {
      const clearedMeta = { ...(targetEvent.metadata || {}) };
      delete clearedMeta.is_home_notif;
      await apiPost('/api/events', {
        action: 'update-metadata',
        id: targetEvent.id,
        metadata: clearedMeta,
      }, { auth: true });
    }

    fetchEvents();
    showToast('Home notification selection updated.', 'success');
  }

  function openEditModal(event = null) {
    setNewTraitKey('');
    setNewTraitValue('');
    if (event) {
      setEditingEvent(event);
      setEventForm({
        ...event,
        price: event.price == null ? '' : (event.price / 100).toFixed(2),
        event_date: event.event_date ?? '',
        event_time: event.event_time ?? '',
        capacity: event.capacity ?? '',
        location_name: event.location_name ?? '',
        address: event.address ?? '',
        description: event.description ?? '',
        image_url: event.image_url ?? '',
        partiful_url: event.partiful_url ?? '',
        is_private: event.is_private ?? true,
        status: event.status ?? '',
        square_variation_id: event.square_variation_id ?? '',
        metadata: event.metadata ?? {}
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        name: '',
        price: '',
        event_date: '',
        event_time: '',
        location_name: '',
        address: '',
        description: '',
        capacity: '',
        image_url: '',
        partiful_url: '',
        is_private: true,
        status: 'active',
        square_variation_id: '',
        metadata: {}
      });
    }
    setIsModalOpen(true);
  }

  useEffect(() => {
    if (!isModalOpen || fetchingCatalog || squareItems.length > 0 || squareError) {
      return;
    }

    fetchSquareCatalog();
  }, [fetchSquareCatalog, fetchingCatalog, isModalOpen, squareError, squareItems.length]);

  function addTrait() {
    if (!newTraitKey || !newTraitValue) return;
    if (MANAGED_METADATA_KEYS.has(newTraitKey)) {
      showToast('That key is managed by the event form above.', 'error');
      return;
    }

    setEventForm({
      ...eventForm,
      metadata: {
        ...eventForm.metadata,
        [newTraitKey.toUpperCase()]: newTraitValue
      }
    });
    setNewTraitKey('');
    setNewTraitValue('');
  }

  function removeTrait(key) {
    const newMetadata = { ...eventForm.metadata };
    delete newMetadata[key];
    setEventForm({ ...eventForm, metadata: newMetadata });
  }

  async function enableSquareTracking(variationId) {
    triggerConfirm('Turn on inventory tracking for this item in Square?', async () => {
      try {
        const response = await fetch('/api/enable-square-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variationId })
        });
        const result = await response.json();
        if (result.success) {
          showToast('Tracking enabled! Now set your stock count in Square.');
          fetchSquareCatalog();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    });
  }

  async function createTestItem() {
    triggerConfirm('This will create a real item called "API TEST TICKET" in your Square account. Proceed?', async () => {
      try {
        const response = await fetch('/api/create-test-item', {
          method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
          showToast('SUCCESS! "API TEST TICKET" created in Square. Refreshing catalog...');
          fetchSquareCatalog();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        showToast('Error creating test item: ' + err.message, 'error');
      }
    });
  }

  function updateMetadataField(key, value) {
    setEventForm({
      ...eventForm,
      metadata: {
        ...eventForm.metadata,
        [key]: value
      }
    });
  }

  async function handleEventSubmit(e) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(eventForm.price) * 100);
    if (!eventForm.name || isNaN(priceCents)) return showToast('Invalid name or price', 'error');

    const data = {
      name: eventForm.name,
      price: priceCents,
      event_date: eventForm.event_date || null,
      event_time: eventForm.event_time || null,
      location_name: eventForm.location_name || '',
      address: eventForm.address || '',
      description: eventForm.description || '',
      capacity: eventForm.capacity ? parseInt(eventForm.capacity) : null,
      image_url: eventForm.image_url || '',
      partiful_url: eventForm.partiful_url || '',
      is_private: eventForm.is_private,
      status: eventForm.status || 'active',
      square_variation_id: eventForm.square_variation_id || '',
      metadata: eventForm.metadata || {}
    };

    try {
      await apiPost('/api/events', {
        ...data,
        id: editingEvent?.id,
        previousName: editingEvent?.name,
      }, { auth: true });
      setIsModalOpen(false);
      fetchEvents();
      if (editingEvent && eventForm.name !== editingEvent.name) {
        fetchRequests();
      }
    } catch (error) {
      showToast('Error saving event: ' + error.message, 'error');
    }
  }

  const customMetadataEntries = Object.entries(eventForm.metadata || {}).filter(([key]) => !MANAGED_METADATA_KEYS.has(key));
  const eventsByName = useMemo(() => {
    return (events || []).reduce((acc, event) => {
      const normalizedName = String(event.name || '').trim().toLowerCase();
      if (!normalizedName) return acc;
      if (!acc[normalizedName]) acc[normalizedName] = [];
      acc[normalizedName].push(event);
      acc[normalizedName].sort((a, b) => {
        const aTime = new Date(a.created_at || a.event_date || 0).getTime();
        const bTime = new Date(b.created_at || b.event_date || 0).getTime();
        return bTime - aTime;
      });
      return acc;
    }, {});
  }, [events]);

  const requestsByOrderId = useMemo(() => {
    return (requests || []).reduce((acc, request) => {
      if (!request.square_order_id) return acc;
      acc[request.square_order_id] = request;
      return acc;
    }, {});
  }, [requests]);

  const issuedTicketOrderIds = useMemo(() => {
    return new Set(
      (tickets || [])
        .map((ticket) => ticket.square_order_id)
        .filter(Boolean)
    );
  }, [tickets]);

  function isArchivedRequest(request) {
    return Boolean(request?.is_archived || request?.status === 'archived');
  }

  function getRequestDisplayStatus(request) {
    if (request?.status && request.status !== 'archived') {
      return request.status;
    }

    if (hasIssuedTicketForRequest(request)) {
      return 'fulfilled';
    }

    if (request?.square_order_id) {
      return 'approved';
    }

    return 'pending';
  }

  function getRequestStatusBadgeClass(request) {
    const displayStatus = getRequestDisplayStatus(request);
    return displayStatus === 'fulfilled' ? 'approved' : displayStatus;
  }

  function hasIssuedTicketForRequest(request) {
    return Boolean(request?.square_order_id && issuedTicketOrderIds.has(request.square_order_id));
  }

  function isRecoverableApprovedRequest(request) {
    return request?.status === 'approved' && request?.square_order_id && !hasIssuedTicketForRequest(request);
  }

  const ticketRecords = useMemo(() => {
    return (tickets || []).map((ticket) => {
      let resolvedEvent = null;

      if (ticket.event_id) {
        resolvedEvent = (events || []).find((event) => event.id === ticket.event_id) || null;
      }

      if (!resolvedEvent && ticket.square_order_id) {
        const linkedRequest = requestsByOrderId[ticket.square_order_id];
        const matchedEvents = linkedRequest?.event_name
          ? eventsByName[String(linkedRequest.event_name).trim().toLowerCase()] || []
          : [];
        resolvedEvent = matchedEvents[0] || null;
      }

      return {
        ...ticket,
        resolvedEvent,
        resolvedEventId: resolvedEvent?.id || ticket.event_id || null,
        resolvedEventName: resolvedEvent?.name || 'Unlinked ticket',
      };
    });
  }, [events, eventsByName, requestsByOrderId, tickets]);

  const ticketsByEventId = useMemo(() => {
    return ticketRecords.reduce((acc, ticket) => {
      if (!ticket.resolvedEventId) return acc;
      if (!acc[ticket.resolvedEventId]) acc[ticket.resolvedEventId] = [];
      acc[ticket.resolvedEventId].push(ticket);
      return acc;
    }, {});
  }, [ticketRecords]);

  function toggleExpandedEvent(eventId) {
    setExpandedEventId(current => current === eventId ? null : eventId);
  }

  function toggleExpandedTicket(ticketId) {
    setExpandedTicketIds((current) => ({
      ...current,
      [ticketId]: !current[ticketId],
    }));
  }

  async function reconcileRequestTicket(request) {
    triggerConfirm(`Issue ticket for ${request.customer_name}?`, async () => {
      try {
        await apiPost('/api/confirm-ticket', { requestId: request.id });
        fetchRequests();
        fetchTickets();
        showToast(`Ticket issued for ${request.customer_name}`);
      } catch (error) {
        console.error('Error reconciling ticket:', error);
        showToast('Failed to issue ticket: ' + error.message, 'error');
      }
    });
  }

  async function archiveRequest(request) {
    try {
      await apiPost('/api/requests', {
        action: 'set-archive',
        id: request.id,
        isArchived: true,
      }, { auth: true });
      fetchRequests();
      showToast(`Archived ${request.customer_name} without changing request status.`);
    } catch (error) {
      console.error('Error archiving request:', error);
      showToast('Failed to archive request: ' + error.message, 'error');
    }
  }

  async function unarchiveRequest(request) {
    try {
      await apiPost('/api/requests', {
        action: 'set-archive',
        id: request.id,
        isArchived: false,
      }, { auth: true });
      fetchRequests();
      showToast(`Unarchived ${request.customer_name} and kept status as ${request.status}.`);
    } catch (error) {
      console.error('Error unarchiving request:', error);
      showToast('Failed to unarchive request: ' + error.message, 'error');
    }
  }

  return (
    <>
       {shouldRender(sectionIds.mgmt) && (
       <section className="admin-section" style={{ '--active-tab-color': '#004ffa' }}>
          <div className="section-header-flex">
            <AdminSectionHeader
              title="EVENT MANAGEMENT"
              isPinned={pinnedSections.includes(sectionIds.mgmt)}
              onTogglePin={() => onTogglePin(sectionIds.mgmt)}
              isCollapsed={isCollapsed(sectionIds.mgmt)}
              onToggleCollapse={() => onToggleCollapse(sectionIds.mgmt)}
              collapsedCount={activeEventCount}
            />
            {!isCollapsed(sectionIds.mgmt) && !tableMissing && (
              <div className="action-buttons">
                <button 
                  className={`admin-btn small ${showArchivedEvents ? 'active' : ''}`}
                  onClick={() => setShowArchivedEvents(!showArchivedEvents)}
                  style={{ marginRight: '10px' }}
                >
                  {showArchivedEvents ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({events.filter(e => e.status === 'archived').length})
                </button>
                <button className="admin-btn approve" onClick={() => openEditModal()}>+ ADD EVENT</button>
              </div>
            )}
          </div>

        {!isCollapsed(sectionIds.mgmt) && (tableMissing ? (
          <div className="setup-guide">
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>DATABASE SETUP REQUIRED</h3>
            </div>
            <p>Please run the full upgrade SQL in your Supabase SQL Editor.</p>
            <button className="admin-btn" onClick={fetchEvents}>REFRESH</button>
          </div>
        ) : (
          <div className="events-table-container admin-table-shell">
            {eventLoading ? (
              <p className="loading-text">RETRIEVING EVENTS...</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>NAME</th>
                    <th style={{ textAlign: 'center' }}>TICKETS</th>
                    <th>PRICE</th>
                    <th>DATE</th>
                    <th>LOCATION</th>
                    <th style={{ textAlign: 'center' }}>FEATURE</th>
                    <th style={{ textAlign: 'center' }}>HOME</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {events
                    .filter(event => showArchivedEvents ? true : event.status !== 'archived')
                    .map((event) => {
                      const eventTickets = ticketsByEventId[event.id] || [];
                      const hasTickets = eventTickets.length > 0;
                      const isExpanded = expandedEventId === event.id;

                      return (
                        <Fragment key={event.id}>
                          <tr className={isExpanded ? 'event-row-expanded' : ''}>
                            <td><span className={`status-pill ${event.status}`}>{event.status}</span></td>
                            <td>
                              {event.name.toUpperCase() === 'SPACE' ? (
                                <a href="/events/space" target="_blank" className="event-name-link">{event.name}</a>
                              ) : (
                                <strong>{event.name}</strong>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {hasTickets ? (
                                <div className="event-ticket-toggle-wrap">
                                  <button
                                    className={`event-ticket-toggle ${isExpanded ? 'expanded' : ''}`}
                                    onClick={() => toggleExpandedEvent(event.id)}
                                    title={isExpanded ? 'Hide ticket holders' : 'Show ticket holders'}
                                  >
                                    <span className="admin-toggle-arrow event-ticket-toggle-arrow">▶</span>
                                  </button>
                                  <span className="event-ticket-toggle-count">{eventTickets.length}</span>
                                </div>
                              ) : (
                                <span className="ticket-toggle-empty">0</span>
                              )}
                            </td>
                            <td>${(event.price / 100).toFixed(2)}</td>
                            <td>{event.event_date || 'TBD'}</td>
                            <td>{event.location_name || 'TBD'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className={`event-flag-toggle ${event.metadata?.is_featured ? 'is-active' : ''}`}
                                onClick={() => toggleHighlightEvent(event)}
                                title={event.metadata?.is_featured ? 'Highlighted as Upcoming' : 'Highlight this event as Upcoming'}
                              >
                                {event.metadata?.is_featured ? '★' : '☆'}
                              </button>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className={`event-flag-toggle ${event.metadata?.is_home_notif ? 'is-active' : ''}`}
                                onClick={() => toggleHomeNotification(event)}
                                title={event.metadata?.is_home_notif ? 'Show on Home Page' : 'Turn on Home Notification'}
                              >
                                {event.metadata?.is_home_notif ? '★' : '☆'}
                              </button>
                            </td>
                            <td className="actions-cell">
                              <div className="actions-wrapper">
                                <div className="main-actions">
                                  <button className="admin-btn" onClick={() => openEditModal(event)}>EDIT</button>
                                </div>
                                <div className="secondary-actions">
                                  <ArchiveToggleButton
                                    isArchived={event.status === 'archived'}
                                    archiveTitle="Archive Event"
                                    unarchiveTitle="Unarchive Event"
                                    onArchive={() => updateEventStatus(event.id, 'archived')}
                                    onUnarchive={() => updateEventStatus(event.id, 'active')}
                                  />
                                  <DeleteActionButton
                                    title="Delete Event"
                                    onClick={() => deleteEvent(event.id)}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                          {hasTickets && isExpanded && (
                            <tr className="ticket-holders-row">
                              <td colSpan="9">
                                <div className="ticket-holders-panel">
                                  <div className="ticket-holders-header">
                                    <span>Issued Tickets</span>
                                    <button className="admin-btn small" onClick={fetchTickets} disabled={ticketsLoading}>
                                      {ticketsLoading ? 'LOADING...' : 'REFRESH'}
                                    </button>
                                  </div>
                                  <table className="admin-table issued-tickets-table inline-issued-tickets-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: '1%', textAlign: 'center' }}></th>
                                        <th>GUEST</th>
                                        <th>EMAIL</th>
                                        <th>STATUS</th>
                                        <th className="ticket-link-header">LINK</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {eventTickets.map((ticket) => {
                                        const isTicketExpanded = Boolean(expandedTicketIds[ticket.id]);
                                        const ticketHref = `/ticket/${ticket.id}`;

                                        return (
                                          <Fragment key={ticket.id}>
                                            <tr className={isTicketExpanded ? 'ticket-detail-row-expanded' : ''}>
                                              <td className="ticket-detail-toggle-cell">
                                                <button
                                                  className={`ticket-detail-toggle ${isTicketExpanded ? 'expanded' : ''}`}
                                                  onClick={() => toggleExpandedTicket(ticket.id)}
                                                  title={isTicketExpanded ? 'Hide ticket metadata' : 'Show ticket metadata'}
                                                >
                                                  <span className="admin-toggle-arrow ticket-toggle-arrow">▶</span>
                                                </button>
                                              </td>
                                              <td>{ticket.customer_name || 'Guest'}</td>
                                              <td>{ticket.customer_email || 'No email on file'}</td>
                                              <td>
                                                <span className={`status-pill ${ticket.is_used ? 'past' : 'approved'}`}>
                                                  {ticket.is_used ? 'used' : 'valid'}
                                                </span>
                                              </td>
                                              <td className="ticket-link-cell">
                                                <a
                                                  href={ticketHref}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="ticket-link-btn"
                                                  title="Open ticket"
                                                  aria-label={`Open ticket for ${ticket.customer_name || 'guest'}`}
                                                >
                                                  <LinkIcon />
                                                </a>
                                              </td>
                                            </tr>
                                            {isTicketExpanded && (
                                              <tr className="ticket-metadata-row">
                                                <td colSpan="5">
                                                  <div className="ticket-metadata-panel">
                                                    <div className="ticket-metadata-grid">
                                                      <div className="ticket-metadata-item">
                                                        <span className="ticket-metadata-label">ISSUED</span>
                                                        <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Unknown'}</span>
                                                      </div>
                                                      <div className="ticket-metadata-item">
                                                        <span className="ticket-metadata-label">USED AT</span>
                                                        <span>{ticket.used_at ? new Date(ticket.used_at).toLocaleString() : '--'}</span>
                                                      </div>
                                                      <div className="ticket-metadata-item">
                                                        <span className="ticket-metadata-label">TICKET ID</span>
                                                        <span className="issued-ticket-mono">{ticket.id}</span>
                                                      </div>
                                                      <div className="ticket-metadata-item">
                                                        <span className="ticket-metadata-label">ORDER ID</span>
                                                        <span className="issued-ticket-mono">{ticket.square_order_id || '--'}</span>
                                                      </div>
                                                      <div className="ticket-metadata-item">
                                                        <span className="ticket-metadata-label">QR PAYLOAD</span>
                                                        <span className="issued-ticket-mono">{ticket.qr_code_payload || '--'}</span>
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

      {/* INVITE REQUESTS SECTION */}
      {shouldRender(sectionIds.reqs) && (
      <section className="admin-section" style={{ '--active-tab-color': '#004ffa' }}>
        <AdminSectionHeader
          title="INVITE REQUESTS"
          isPinned={pinnedSections.includes(sectionIds.reqs)}
          onTogglePin={() => onTogglePin(sectionIds.reqs)}
          isCollapsed={isCollapsed(sectionIds.reqs)}
          onToggleCollapse={() => onToggleCollapse(sectionIds.reqs)}
          collapsedCount={activeRequestCount}
        />
        {!isCollapsed(sectionIds.reqs) && (
          <>
            <div className="admin-stats">
              <div className="stat-item">
                <span className="stat-label">TOTAL REQUESTS</span>
                <span className="stat-value">{requests.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">PENDING</span>
                <span className="stat-value">{requests.filter(r => r.status === 'pending').length}</span>
              </div>
              <div className="stat-item toggle-archived">
                <button 
                  className={`admin-btn small ${showArchivedRequests ? 'active' : ''}`}
                  onClick={() => setShowArchivedRequests(!showArchivedRequests)}
                >
                  {showArchivedRequests ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({requests.filter((request) => isArchivedRequest(request)).length})
                </button>
              </div>
            </div>

            <div className="requests-table-container admin-table-shell">
              {loading ? (
                <p className="loading-text">RETRIEVING DATA...</p>
              ) : (
                <table className="requests-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>EVENT</th>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                  <th style={{ textAlign: 'center' }}>BOUGHT?</th>
                  <th style={{ textAlign: 'center' }}>ARCHIVE</th>
                </tr>
              </thead>
                <tbody>
                {requests
                  .filter((request) => showArchivedRequests ? isArchivedRequest(request) : !isArchivedRequest(request))
                  .map((req) => {
                    const displayStatus = getRequestDisplayStatus(req);
                    const statusBadgeClass = getRequestStatusBadgeClass(req);

                    return (
                  <tr
                    key={req.id}
                    className={isArchivedRequest(req) ? 'status-archived' : `status-${statusBadgeClass}`}
                  >
                    <td>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td>
                      {req.event_name}
                    </td>
                    <td>{req.customer_name}</td>
                    <td>{req.customer_email}</td>
                    <td>
                      <span className={`status-pill ${statusBadgeClass}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="actions-wrapper">
                        <div className="main-actions">
                          {req.status === 'pending' && (
                            <div className="action-buttons">
                              <button
                                className="admin-btn approve"
                                onClick={() => updateStatus(req.id, 'approved', req)}
                              >
                                APPROVE
                              </button>
                              <button
                                className="admin-btn reject"
                                onClick={() => updateStatus(req.id, 'rejected', req)}
                              >
                                REJECT
                              </button>
                            </div>
                          )}
                          {(req.status === 'approved' || req.status === 'rejected') && (
                            <button
                              className="admin-btn reset"
                              onClick={() => updateStatus(req.id, 'pending', req)}
                            >
                              RESET
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isRecoverableApprovedRequest(req) ? (
                        <button
                          type="button"
                          className="ticket-link-btn icon-action-btn"
                          onClick={() => reconcileRequestTicket(req)}
                          title={`Issue ticket for ${req.customer_name}`}
                          aria-label={`Issue ticket for ${req.customer_name}`}
                        >
                          <TicketIcon />
                        </button>
                      ) : req.square_order_id ? (
                        <a
                          href={`/success?requestId=${req.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title={hasIssuedTicketForRequest(req) ? 'Open ticket success page' : 'Open order recovery page'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#004ffa',
                            textDecoration: 'none',
                          }}
                        >
                          <LinkIcon />
                        </a>
                      ) : (
                        <span style={{ color: '#999', fontSize: '14px' }}>--</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="secondary-actions">
                        <ArchiveToggleButton
                          isArchived={isArchivedRequest(req)}
                          archiveTitle="Archive Request"
                          unarchiveTitle="Unarchive Request"
                          onArchive={() => archiveRequest(req)}
                          onUnarchive={() => unarchiveRequest(req)}
                        />
                        <DeleteActionButton
                          title="Delete Request"
                          onClick={() => deleteRequest(req.id)}
                        />
                      </div>
                    </td>
                  </tr>
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

      {/* EVENT MODAL */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{editingEvent ? 'EDIT EVENT' : 'NEW EVENT'}</h3>
              <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleEventSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label>EVENT NAME</label>
                  <input required type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label>PRICE (USD)</label>
                  <input required type="number" step="0.01" value={eventForm.price} onChange={e => setEventForm({...eventForm, price: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label>CAPACITY</label>
                  <input type="number" value={eventForm.capacity} onChange={e => setEventForm({...eventForm, capacity: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>DATE</label>
                  <input required type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>TIME</label>
                  <input required type="time" value={eventForm.event_time} onChange={e => setEventForm({...eventForm, event_time: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>LOCATION NAME</label>
                  <input type="text" value={eventForm.location_name} onChange={e => setEventForm({...eventForm, location_name: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>STATUS</label>
                  <select value={eventForm.status} onChange={e => setEventForm({...eventForm, status: e.target.value})}>
                    <option value="">-- SELECT STATUS --</option>
                    <option value="active">ACTIVE</option>
                    <option value="past">PAST</option>
                    <option value="sold_out">SOLD OUT</option>
                    <option value="draft">DRAFT</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>LINK TO SQUARE ITEM (FOR STOCK TRACKING)</label>
                  <select 
                    disabled={fetchingCatalog}
                    value={eventForm.square_variation_id} 
                    onChange={e => {
                      const variationId = e.target.value;
                      const selectedItem = squareItems.find(item => 
                        item.variations.some(v => v.id === variationId)
                      );
                      const selectedVariation = selectedItem?.variations.find(v => v.id === variationId);
                      
                      setEventForm({
                        ...eventForm, 
                        square_variation_id: variationId,
                        price: selectedVariation ? (selectedVariation.price / 100).toFixed(2) : eventForm.price
                      });
                    }}
                  >
                    {fetchingCatalog ? (
                      <option>LOADING CATALOG...</option>
                    ) : squareError ? (
                      <option>ERROR: {squareError}</option>
                    ) : squareItems.length === 0 ? (
                      <option>-- NO SQUARE ITEMS FOUND --</option>
                    ) : (
                      <>
                        <option value="">-- SELECT SQUARE ITEM (OPTIONAL) --</option>
                        {squareItems.map(item => (
                          <optgroup key={item.id} label={item.name.toUpperCase()}>
                            {item.variations.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name} (${(v.price / 100).toFixed(2)})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </>
                    )}
                  </select>
                  <p className="form-help">Linking to Square enables automated stock management.</p>
                  
                  {eventForm.square_variation_id && (() => {
                    const v = squareItems.flatMap(i => i.variations).find(v => v.id === eventForm.square_variation_id);
                    if (v && !v.trackInventory) {
                      return (
                        <div className="tracking-warning">
                          <span>⚠️ Square inventory tracking is OFF for this item.</span>
                          <button 
                            type="button" 
                            className="admin-btn approve small" 
                            onClick={() => enableSquareTracking(v.id)}
                          >
                            TURN ON TRACKING
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="debug-actions" style={{ marginTop: '10px' }}>
                    <button type="button" className="admin-btn small" onClick={fetchSquareCatalog}>RELOAD CATALOG</button>
                    <button type="button" className="admin-btn small" onClick={createTestItem}>CREATE TEST ITEM</button>
                  </div>
                </div>

                <div className="form-group full">
                  <label>ADDRESS</label>
                  <input type="text" value={eventForm.address} onChange={e => setEventForm({...eventForm, address: e.target.value})} />
                </div>

                <div className="form-group full">
                  <label>DESCRIPTION</label>
                  <textarea rows="4" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>IMAGE URL</label>
                  <input type="text" value={eventForm.image_url} onChange={e => setEventForm({...eventForm, image_url: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>PARTIFUL LINK</label>
                  <input type="text" value={eventForm.partiful_url} onChange={e => setEventForm({...eventForm, partiful_url: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>EVENT PAGE LINK (METADATA)</label>
                  <input 
                    type="text" 
                    value={eventForm.metadata?.event_link ?? ''} 
                    onChange={e => updateMetadataField('event_link', e.target.value)} 
                  />
                </div>

                <div className="form-group full">
                  <label>PERFORMERS LINEUP (COMMA SEPARATED)</label>
                  <input 
                    type="text" 
                    value={eventForm.metadata?.performers ?? ''} 
                    onChange={e => updateMetadataField('performers', e.target.value)} 
                  />
                </div>

                <div className="form-group full">
                  <label>FEATURED ARTISTS (COMMA SEPARATED)</label>
                  <input 
                    type="text" 
                    value={eventForm.metadata?.artists ?? ''} 
                    onChange={e => updateMetadataField('artists', e.target.value)} 
                  />
                </div>

                <div className="form-group full">
                  <label>VENDORS (COMMA SEPARATED)</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.vendors ?? ''}
                    onChange={e => updateMetadataField('vendors', e.target.value)}
                  />
                </div>

                <div className="form-group full" style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
                  <label>APPLE WALLET SETTINGS</label>
                  <p className="form-help">These fields control the Apple Wallet pass for this event. Leave any field blank to use the default pass styling.</p>
                </div>

                <div className="form-group full">
                  <label>WALLET STRIP IMAGE URL (PNG)</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_strip_image_url ?? ''}
                    onChange={e => updateMetadataField('wallet_strip_image_url', e.target.value)}
                  />
                  <p className="form-help">If blank, the pass falls back to the event image URL. Apple Wallet strip images work best as direct PNG files.</p>
                </div>

                <div className="form-group full">
                  <label>WALLET RELEVANCE WINDOWS</label>
                  <textarea
                    rows="4"
                    value={eventForm.metadata?.wallet_relevant_dates ?? ''}
                    onChange={e => updateMetadataField('wallet_relevant_dates', e.target.value)}
                  />
                  <p className="form-help">Optional. Add one Wallet date window per line in the format START/END. This is how a two-day event should be represented.</p>
                </div>

                <div className="form-group">
                  <label>WALLET TIME ZONE</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_time_zone ?? ''}
                    onChange={e => updateMetadataField('wallet_time_zone', e.target.value)}
                  />
                  <p className="form-help">Used to turn the Wallet windows above into Apple-safe timestamps. Defaults to Los Angeles if blank.</p>
                </div>

                <div className="form-group">
                  <label>WALLET EXPIRATION</label>
                  <input
                    type="datetime-local"
                    value={eventForm.metadata?.wallet_expiration_date ?? ''}
                    onChange={e => updateMetadataField('wallet_expiration_date', e.target.value)}
                  />
                  <p className="form-help">Optional. If blank, Wallet expires the pass after the final relevance window ends.</p>
                </div>

                <div className="form-group">
                  <label>WALLET COORDINATES</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_coordinates ?? ''}
                    onChange={e => updateMetadataField('wallet_coordinates', e.target.value)}
                  />
                  <p className="form-help">Paste as one line, like `34.052235 N, 118.243683 W` or `34.052235, -118.243683`.</p>
                </div>

                <div className="form-group">
                  <label>WALLET LOCATION OVERRIDE</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_location_override ?? ''}
                    onChange={e => updateMetadataField('wallet_location_override', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>WALLET LOGO TEXT</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_logo_text ?? ''}
                    onChange={e => updateMetadataField('wallet_logo_text', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>WALLET DESCRIPTION</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_description ?? ''}
                    onChange={e => updateMetadataField('wallet_description', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>WALLET BACKGROUND COLOR</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_background_color ?? ''}
                    onChange={e => updateMetadataField('wallet_background_color', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>WALLET FOREGROUND COLOR</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_foreground_color ?? ''}
                    onChange={e => updateMetadataField('wallet_foreground_color', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>WALLET LABEL COLOR</label>
                  <input
                    type="text"
                    value={eventForm.metadata?.wallet_label_color ?? ''}
                    onChange={e => updateMetadataField('wallet_label_color', e.target.value)}
                  />
                </div>

                <div className="form-group full">
                  <label>WALLET NOTES</label>
                  <textarea
                    rows="3"
                    value={eventForm.metadata?.wallet_notes ?? ''}
                    onChange={e => updateMetadataField('wallet_notes', e.target.value)}
                  />
                </div>

                <div className="form-group checkbox">
                  <input type="checkbox" id="is_private" checked={eventForm.is_private} onChange={e => setEventForm({...eventForm, is_private: e.target.checked})} />
                  <label htmlFor="is_private">PRIVATE (REQUEST ONLY)</label>
                </div>

                <div className="form-group full trait-builder-section">
                  <label>CUSTOM TRAITS (METADATA)</label>
                  <div className="trait-input-row">
                    <input 
                      type="text" 
                      value={newTraitKey} 
                      onChange={e => setNewTraitKey(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      value={newTraitValue} 
                      onChange={e => setNewTraitValue(e.target.value)} 
                    />
                    <button type="button" className="admin-btn" onClick={addTrait}>ADD</button>
                  </div>
                  
                  <div className="traits-list">
                    {customMetadataEntries.map(([key, val]) => (
                      <div key={key} className="trait-pill">
                        <span className="trait-key">{key}:</span>
                        <span className="trait-val">{val}</span>
                        <button type="button" className="remove-trait" onClick={() => removeTrait(key)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="admin-btn approve wide">SAVE EVENT</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
