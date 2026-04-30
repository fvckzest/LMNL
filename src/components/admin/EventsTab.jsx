import { useState } from 'react';
import { apiPost } from '../../lib/api';
import { ArchiveIcon, UnarchiveIcon, TrashIcon } from './Icons';

export default function EventsTab({
  events,
  eventLoading,
  tableMissing,
  squareItems,
  fetchingCatalog,
  squareError,
  fetchEvents,
  fetchRequests,
  showToast,
  triggerConfirm,
  fetchSquareCatalog,
  requests,
  loading,
  updateStatus,
  deleteRequest,
  hasBoughtTicket
}) {
  const [showArchivedEvents, setShowArchivedEvents] = useState(false);
  const [showArchivedRequests, setShowArchivedRequests] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newTraitKey, setNewTraitKey] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');

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
      await apiPost('/api/events', { action: 'update-status', id, status: newStatus });
      fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      showToast('Failed to update event status: ' + error.message, 'error');
    }
  }

  async function deleteEvent(id) {
    triggerConfirm('Are you sure you want to delete this event permanently?', async () => {
      try {
        await apiPost('/api/events', { action: 'delete', id });
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
      });

      const others = events.filter(e => e.id !== targetEvent.id && e.metadata?.is_featured);
      for (const other of others) {
        const otherMeta = { ...other.metadata };
        delete otherMeta.is_featured;
        await apiPost('/api/events', {
          action: 'update-metadata',
          id: other.id,
          metadata: otherMeta,
        });
      }
    } else {
      const clearedMeta = { ...(targetEvent.metadata || {}) };
      delete clearedMeta.is_featured;
      await apiPost('/api/events', {
        action: 'update-metadata',
        id: targetEvent.id,
        metadata: clearedMeta,
      });
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
      });

      // Unset others
      const others = events.filter(e => e.id !== targetEvent.id && e.metadata?.is_home_notif);
      for (const other of others) {
        const otherMeta = { ...other.metadata };
        delete otherMeta.is_home_notif;
        await apiPost('/api/events', {
          action: 'update-metadata',
          id: other.id,
          metadata: otherMeta,
        });
      }
    } else {
      const clearedMeta = { ...(targetEvent.metadata || {}) };
      delete clearedMeta.is_home_notif;
      await apiPost('/api/events', {
        action: 'update-metadata',
        id: targetEvent.id,
        metadata: clearedMeta,
      });
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
        price: (event.price / 100).toFixed(2),
        event_date: event.event_date || '',
        event_time: event.event_time || '',
        capacity: event.capacity || '',
        location_name: event.location_name || '',
        address: event.address || '',
        description: event.description || '',
        image_url: event.image_url || '',
        partiful_url: event.spotify_id || '', 
        is_private: event.is_private ?? true,
        status: event.status || 'active',
        square_variation_id: event.square_variation_id || '',
        metadata: event.metadata || {}
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

  function addTrait() {
    if (!newTraitKey || !newTraitValue) return;
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
      spotify_id: eventForm.partiful_url || '',
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
      });
      setIsModalOpen(false);
      fetchEvents();
      if (editingEvent && eventForm.name !== editingEvent.name) {
        fetchRequests();
      }
    } catch (error) {
      showToast('Error saving event: ' + error.message, 'error');
    }
  }

  return (
    <>
      <section className="admin-section" style={{ '--active-tab-color': '#004ffa' }}>
        <div className="section-header-flex">
          <h2 className="section-title">EVENT MANAGEMENT</h2>
          {!tableMissing && (
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
        
        {tableMissing ? (
          <div className="setup-guide">
            <div className="guide-header">
              <span className="warning-icon">⚠️</span>
              <h3>DATABASE SETUP REQUIRED</h3>
            </div>
            <p>Please run the full upgrade SQL in your Supabase SQL Editor.</p>
            <button className="admin-btn" onClick={fetchEvents}>REFRESH</button>
          </div>
        ) : (
          <div className="events-table-container">
            {eventLoading ? (
              <p className="loading-text">RETRIEVING EVENTS...</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>NAME</th>
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
                    .map((event) => (
                    <tr key={event.id}>
                      <td><span className={`status-pill ${event.status}`}>{event.status}</span></td>
                      <td>
                        {event.name.toUpperCase() === 'SPACE' ? (
                          <a href="/space" target="_blank" className="event-name-link">{event.name}</a>
                        ) : (
                          <strong>{event.name}</strong>
                        )}
                      </td>
                      <td>${(event.price / 100).toFixed(2)}</td>
                      <td>{event.event_date || 'TBD'}</td>
                      <td>{event.location_name || 'TBD'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => toggleHighlightEvent(event)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '20px',
                            color: event.metadata?.is_featured ? '#004ffa' : '#ccc',
                            padding: '5px',
                            transition: 'color 0.2s ease'
                          }}
                          title={event.metadata?.is_featured ? 'Highlighted as Upcoming' : 'Highlight this event as Upcoming'}
                        >
                          {event.metadata?.is_featured ? '★' : '☆'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => toggleHomeNotification(event)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '20px',
                            color: event.metadata?.is_home_notif ? '#004ffa' : '#ccc',
                            padding: '5px',
                            transition: 'color 0.2s ease'
                          }}
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
                          <div className="secondary-actions" style={{ display: 'flex', gap: '10px' }}>
                            {event.status !== 'archived' ? (
                              <button
                                className="icon-btn archive-btn"
                                title="Archive Event"
                                onClick={() => updateEventStatus(event.id, 'archived')}
                              >
                                <ArchiveIcon />
                              </button>
                            ) : (
                              <button
                                className="icon-btn unarchive-btn"
                                title="Unarchive Event"
                                onClick={() => updateEventStatus(event.id, 'active')}
                              >
                                <UnarchiveIcon />
                              </button>
                            )}
                            <button
                              className="icon-btn delete-btn"
                              style={{ color: '#991b1b' }}
                              title="Delete Event"
                              onClick={() => deleteEvent(event.id)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* INVITE REQUESTS SECTION */}
      <section className="admin-section" style={{ '--active-tab-color': '#004ffa', marginTop: '40px' }}>
        <h2 className="section-title">INVITE REQUESTS</h2>
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
              {showArchivedRequests ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({requests.filter(r => r.status === 'archived').length})
            </button>
          </div>
        </div>

        <div className="requests-table-container">
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
                  .filter(req => showArchivedRequests ? true : req.status !== 'archived')
                  .map((req) => (
                  <tr key={req.id} className={`status-${req.status}`}>
                    <td>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td>
                      {req.event_name.toUpperCase() === 'SPACE' ? (
                        <a href="/space" target="_blank" className="event-name-link">{req.event_name}</a>
                      ) : (
                        req.event_name
                      )}
                    </td>
                    <td>{req.customer_name}</td>
                    <td>{req.customer_email}</td>
                    <td>
                      <span className={`status-pill ${req.status}`}>
                        {req.status}
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
                          {req.status === 'archived' && (
                            <button
                              className="admin-btn reset"
                              onClick={() => updateStatus(req.id, 'pending', req)}
                            >
                              UNARCHIVE
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasBoughtTicket(req) ? (
                        <span style={{ color: '#22c55e', fontSize: '16px', fontWeight: 'bold' }}>✓</span>
                      ) : (
                        <span style={{ color: '#999', fontSize: '14px' }}>--</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        {req.status !== 'archived' ? (
                          <button
                            className="icon-btn archive-btn"
                            title="Archive Request"
                            onClick={() => updateStatus(req.id, 'archived', req)}
                            style={{ padding: '5px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <ArchiveIcon />
                          </button>
                        ) : (
                          <button
                            className="icon-btn unarchive-btn"
                            title="Unarchive Request"
                            onClick={() => updateStatus(req.id, 'pending', req)}
                            style={{ padding: '5px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <UnarchiveIcon />
                          </button>
                        )}
                        <button
                          className="icon-btn delete-btn"
                          title="Delete Request"
                          onClick={() => deleteRequest(req.id)}
                          style={{ padding: '5px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#991b1b' }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

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
                  <input type="text" placeholder="https://partiful.com/e/..." value={eventForm.partiful_url} onChange={e => setEventForm({...eventForm, partiful_url: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>EVENT PAGE LINK (METADATA)</label>
                  <input 
                    type="text" 
                    placeholder="https://..." 
                    value={eventForm.metadata?.event_link || ''} 
                    onChange={e => setEventForm({
                      ...eventForm,
                      metadata: {
                        ...eventForm.metadata,
                        event_link: e.target.value
                      }
                    })} 
                  />
                </div>

                <div className="form-group full">
                  <label>PERFORMERS LINEUP (COMMA SEPARATED)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Artist A, Artist B, Artist C" 
                    value={eventForm.metadata?.performers || ''} 
                    onChange={e => setEventForm({
                      ...eventForm,
                      metadata: {
                        ...eventForm.metadata,
                        performers: e.target.value
                      }
                    })} 
                  />
                </div>

                <div className="form-group full">
                  <label>FEATURED ARTISTS (COMMA SEPARATED)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Painter A, Sculptor B, Visualist C" 
                    value={eventForm.metadata?.artists || ''} 
                    onChange={e => setEventForm({
                      ...eventForm,
                      metadata: {
                        ...eventForm.metadata,
                        artists: e.target.value
                      }
                    })} 
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
                      placeholder="TRAIT (e.g. VIBE)" 
                      value={newTraitKey} 
                      onChange={e => setNewTraitKey(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      placeholder="VALUE (e.g. DARK)" 
                      value={newTraitValue} 
                      onChange={e => setNewTraitValue(e.target.value)} 
                    />
                    <button type="button" className="admin-btn" onClick={addTrait}>ADD</button>
                  </div>
                  
                  <div className="traits-list">
                    {Object.entries(eventForm.metadata || {}).map(([key, val]) => (
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
