import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import './Admin.css';

const ArchiveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"></polyline>
    <rect x="1" y="3" width="22" height="5"></rect>
    <line x1="10" y1="12" x2="14" y2="12"></line>
  </svg>
);

const UnarchiveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10l4 4v9H3V8z"></path>
    <path d="M13 8V4H7v4"></path>
    <line x1="12" y1="15" x2="12" y2="15"></line>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);


export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [serviceInquiries, setServiceInquiries] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [showArchivedServices, setShowArchivedServices] = useState(false);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'shop', 'inquiries'
  const [tickets, setTickets] = useState([]);


  const tabColors = {
    all: '#000000',
    events: '#004ffa',
    shop: '#ff0000',
    inquiries: '#6222d8'
  };




  
  // Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
    type: 'success'
  });

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => {
      setToast({ isOpen: false, message: '', type: 'success' });
    }, 4000);
  };

  const triggerConfirm = (message, onConfirm) => {

    setConfirmModal({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

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
  
  const [squareItems, setSquareItems] = useState([]);
  const [fetchingCatalog, setFetchingCatalog] = useState(false);
  const [squareError, setSquareError] = useState(null);
  
  // New Trait UI state
  const [newTraitKey, setNewTraitKey] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');

  useEffect(() => {
    fetchRequests();
    fetchEvents();
    fetchSquareCatalog();
    fetchServiceInquiries();
    fetchTickets();
  }, []);

  async function fetchTickets() {
    const { data, error } = await supabase.from('tickets').select('*');
    if (error) console.error('Error fetching tickets:', error);
    else setTickets(data || []);
  }

  const hasBoughtTicket = (req) => {
    if (req.status === 'fulfilled') return true;
    
    const matchedEvent = events.find(e => e.name === req.event_name);
    return tickets.some(t => 
      t.customer_email?.toLowerCase() === req.customer_email?.toLowerCase() &&
      (matchedEvent ? t.event_id === matchedEvent.id : true)
    );
  };


  async function fetchServiceInquiries() {
    setServicesLoading(true);
    const { data, error } = await supabase
      .from('service_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching service inquiries:', error);
    else setServiceInquiries(data || []);
    setServicesLoading(false);
  }

  async function updateServiceStatus(id, newStatus) {
    const { error } = await supabase
      .from('service_inquiries')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) console.error('Error updating service status:', error);
    else fetchServiceInquiries();
  }


  async function fetchSquareCatalog() {
    setFetchingCatalog(true);
    setSquareError(null);
    try {
      const response = await fetch('/api/list-square-catalog');
      const result = await response.json();
      if (result.error) {
        setSquareError(result.error);
      } else {
        setSquareItems(result.items || []);
        if (result.items?.length === 0) {
          console.log('Square catalog is empty in ' + result.environment + ' mode.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch Square catalog:', err);
      setSquareError('Failed to connect to API');
    }
    setFetchingCatalog(false);
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



  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching requests:', error);
    else setRequests(data);
    setLoading(false);
  }

  async function fetchEvents() {
    setEventLoading(true);
    setTableMissing(false);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      if (error.code === '42P01' || error.message?.includes('not found')) {
        setTableMissing(true);
      }
      setEvents([]);
    } else {
      setEvents(data);
    }
    setEventLoading(false);
  }

  async function updateEventStatus(id, newStatus) {
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating event status:', error);
      showToast('Failed to update event status: ' + error.message, 'error');
    } else {
      fetchEvents();
    }
  }

  async function deleteEvent(id) {
    triggerConfirm('Are you sure you want to delete this event permanently?', async () => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting event:', error);
        showToast('Failed to delete event: ' + error.message, 'error');
      } else {
        fetchEvents();
      }
    });
  }




  async function updateStatus(id, newStatus, requestData) {
    if (newStatus === 'approved') {
      setLoading(true);
      try {
        const response = await fetch('/api/approve-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: id,
            customerEmail: requestData.customer_email,
            customerName: requestData.customer_name,
            eventName: requestData.event_name
          })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);
        
        showToast('APPROVE SUCCESS: Square link generated and email sent.');
      } catch (err) {
        console.error('Approval failed:', err);
        showToast('ERROR: ' + err.message, 'error');
      }

      fetchRequests();
    } else {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) console.error('Error updating status:', error);
      else fetchRequests();
    }
  }

  function openEditModal(event = null) {
    setNewTraitKey('');
    setNewTraitValue('');
    if (event) {
      setEditingEvent(event);
      setEventForm({
        ...event,
        price: (event.price / 100).toFixed(2),
        capacity: event.capacity || '',
        location_name: event.location_name || '',
        address: event.address || '',
        description: event.description || '',
        image_url: event.image_url || '',
        partiful_url: event.spotify_id || '', // DB column is still `spotify_id`, repurposed for Partiful
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

  async function handleEventSubmit(e) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(eventForm.price) * 100);
    if (!eventForm.name || isNaN(priceCents)) return showToast('Invalid name or price', 'error');


    const data = {
      ...eventForm,
      spotify_id: eventForm.partiful_url, // Map back to DB column
      price: priceCents,
      capacity: eventForm.capacity ? parseInt(eventForm.capacity) : null
    };
    
    // Remove the temporary partiful_url field before sending
    delete data.partiful_url;

    let error;
    if (editingEvent) {
      const { error: err } = await supabase.from('events').update(data).eq('id', editingEvent.id);
      error = err;
      
      if (!error && eventForm.name !== editingEvent.name) {
        await supabase.from('requests').update({ event_name: eventForm.name }).eq('event_name', editingEvent.name);
        fetchRequests();
      }
    } else {
      const { error: err } = await supabase.from('events').insert([data]);
      error = err;
    }

    if (error) {
      showToast('Error saving event: ' + error.message, 'error');
    } else {
      setIsModalOpen(false);
      fetchEvents();
    }
  }


  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content admin-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: tabColors[activeTab] || '#ff0000' }} />
          <h1 className="page-title">ADMIN</h1>
        </div>

        <div className="admin-body" style={{ '--active-tab-color': tabColors[activeTab] }}>
          <div className="tabs-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #eee' }}>
            <div className="admin-tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>

            <button 
              className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
              style={activeTab === 'all' ? { borderBottomColor: '#000000', color: '#000000' } : {}}
            >
              ALL
            </button>
            <button 
              className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
              style={activeTab === 'events' ? { borderBottomColor: '#004ffa', color: '#004ffa' } : {}}
            >
              EVENTS
            </button>
            <button 
              className={`admin-tab ${activeTab === 'shop' ? 'active' : ''}`}
              onClick={() => setActiveTab('shop')}
              style={activeTab === 'shop' ? { borderBottomColor: '#ff0000', color: '#ff0000' } : {}}
            >
              SHOP
            </button>
            <button 
              className={`admin-tab ${activeTab === 'inquiries' ? 'active' : ''}`}
              onClick={() => setActiveTab('inquiries')}
              style={activeTab === 'inquiries' ? { borderBottomColor: '#6222d8', color: '#6222d8' } : {}}
            >
              INQUIRIES
            </button>
            </div>
            <button className="admin-btn signout-btn" style={{ padding: '10px 24px', fontSize: '13px', fontWeight: '700' }} onClick={() => triggerConfirm('Are you sure you want to sign out?', () => supabase.auth.signOut())}>SIGN OUT</button>

          </div>

          {(activeTab === 'events' || activeTab === 'all') && (

            <>
              <section className="admin-section" style={{ '--active-tab-color': '#004ffa' }}>


            <div className="section-header-flex">
              <h2 className="section-title">EVENT MANAGEMENT</h2>
              {!tableMissing && (
                <div className="action-buttons">
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
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
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
                            // Autofill price if it's a new event or user wants to sync
                            price: selectedVariation ? (selectedVariation.price / 100).toFixed(2) : eventForm.price
                          });
                        }}
                      >
                        {fetchingCatalog ? (
                          <option>LOADING CATALOG...</option>
                        ) : squareError ? (
                          <option>ERROR: {squareError}</option>
                        ) : squareItems.length === 0 ? (
                          <option>-- NO SQUARE ITEMS FOUND (CLICK DEBUG BELOW) --</option>
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

          <section className="admin-section" style={{ '--active-tab-color': '#004ffa' }}>

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
                  className={`admin-btn small ${showArchived ? 'active' : ''}`}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  {showArchived ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({requests.filter(r => r.status === 'archived').length})
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
                      <th style={{ textAlign: 'center' }}>BOUGHT?</th>

                      <th>ACTIONS</th>

                    </tr>
                  </thead>
                  <tbody>
                    {requests
                      .filter(req => showArchived ? true : req.status !== 'archived')
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
                        <td style={{ textAlign: 'center' }}>
                          {hasBoughtTicket(req) ? (
                            <span style={{ color: '#22c55e', fontSize: '16px', fontWeight: 'bold' }}>✓</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontSize: '16px', fontWeight: 'bold' }}>✕</span>
                          )}
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
                            
                            <div className="secondary-actions">
                              {req.status !== 'archived' ? (
                                <button
                                  className="icon-btn archive-btn"
                                  title="Archive Request"
                                  onClick={() => updateStatus(req.id, 'archived', req)}
                                >
                                  <ArchiveIcon />
                                </button>
                              ) : (
                                <button
                                  className="icon-btn unarchive-btn"
                                  title="Unarchive Request"
                                  onClick={() => updateStatus(req.id, 'pending', req)}
                                >
                                  <UnarchiveIcon />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
            </>
          )}

          {(activeTab === 'inquiries' || activeTab === 'all') && (
          <section className="admin-section" style={{ '--active-tab-color': '#6222d8' }}>


            <h2 className="section-title">SERVICE INQUIRIES</h2>
            <div className="admin-stats">
              <div className="stat-item">
                <span className="stat-label">TOTAL INQUIRIES</span>
                <span className="stat-value">{serviceInquiries.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">PENDING</span>
                <span className="stat-value">{serviceInquiries.filter(r => r.status === 'pending').length}</span>
              </div>
              <div className="stat-item toggle-archived">
                <button 
                  className={`admin-btn small ${showArchivedServices ? 'active' : ''}`}
                  onClick={() => setShowArchivedServices(!showArchivedServices)}
                >
                  {showArchivedServices ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({serviceInquiries.filter(r => r.status === 'archived').length})
                </button>
              </div>
            </div>

            <div className="requests-table-container">
              {servicesLoading ? (
                <p className="loading-text">RETRIEVING DATA...</p>
              ) : serviceInquiries.length === 0 ? (
                <p className="loading-text">NO SERVICE INQUIRIES FOUND.</p>
              ) : (
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>NAME / ENTITY</th>
                      <th>EMAIL</th>
                      <th>SERVICES</th>
                      <th>PROJECT BRIEF</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceInquiries
                      .filter(req => showArchivedServices ? true : req.status !== 'archived')
                      .map((req) => (
                      <tr key={req.id} className={`status-${req.status}`}>
                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                        <td><strong>{req.name}</strong></td>
                        <td>{req.email}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {Array.isArray(req.selected_services) && req.selected_services.map(s => (
                              <span key={s} className="status-pill active" style={{ fontSize: '10px', background: '#6222d8', color: '#ffffff', borderRadius: '0px' }}>
                                {s.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '12px' }}>{req.notes}</td>
                        <td>
                          <span className={`status-pill ${req.status}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="actions-wrapper">
                            <div className="main-actions">
                              {req.status === 'pending' && (
                                <button
                                  className="admin-btn approve"
                                  onClick={() => updateServiceStatus(req.id, 'contacted')}
                                >
                                  MARK CONTACTED
                                </button>
                              )}
                              {req.status === 'contacted' && (
                                <button
                                  className="admin-btn reset"
                                  onClick={() => updateServiceStatus(req.id, 'pending')}
                                >
                                  RESET
                                </button>
                              )}
                            </div>
                            <div className="secondary-actions">
                              {req.status !== 'archived' ? (
                                <button
                                  className="icon-btn archive-btn"
                                  title="Archive"
                                  onClick={() => updateServiceStatus(req.id, 'archived')}
                                >
                                  <ArchiveIcon />
                                </button>
                              ) : (
                                <button
                                  className="icon-btn unarchive-btn"
                                  title="Unarchive"
                                  onClick={() => updateServiceStatus(req.id, 'pending')}
                                >
                                  <UnarchiveIcon />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          )}

          {(activeTab === 'shop' || activeTab === 'all') && (
          <section className="admin-section" style={{ '--active-tab-color': '#ff0000' }}>


            <div className="section-header-flex">
              <h2 className="section-title">SQUARE PRODUCT CATALOG
 <span className="status-pill pending" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>READ ONLY</span></h2>
              <button className="admin-btn" onClick={fetchSquareCatalog} disabled={fetchingCatalog}>
                {fetchingCatalog ? 'REFRESHING...' : 'REFRESH CATALOG'}
              </button>
            </div>
            
            <div className="requests-table-container">
              {fetchingCatalog ? (
                <p className="loading-text">FETCHING SQUARE CATALOG...</p>
              ) : squareError ? (
                <div className="setup-guide">
                  <p>ERROR: {squareError}</p>
                </div>
              ) : squareItems.length === 0 ? (
                <p className="loading-text">NO PRODUCTS FOUND IN SQUARE.</p>
              ) : (
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>PRODUCT NAME</th>
                      <th>VARIATION</th>
                      <th>PRICE</th>
                      <th>STOCK</th>
                      <th>ID (FOR REFERENCE)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squareItems.map((item) => (
                      item.variations.map((v, idx) => (
                        <tr key={v.id}>
                          {idx === 0 ? (
                            <td rowSpan={item.variations.length}><strong>{item.name.toUpperCase()}</strong></td>
                          ) : null}
                          <td>{v.name}</td>
                          <td>${(v.price / 100).toFixed(2)}</td>
                          <td>
                            {v.trackInventory ? v.quantity : 'N/A'}
                          </td>
                          <td style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>{v.id}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          )}
        </div>

        {toast.isOpen && (
          <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: toast.type === 'success' ? '#000' : '#991b1b',
            color: '#fff',
            padding: '15px 25px',
            fontSize: '12px',
            letterSpacing: '0.1em',
            fontWeight: '600',
            textTransform: 'uppercase',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            animation: 'slideIn 0.3s ease forwards'
          }}>
            <span>{toast.message}</span>
          </div>
        )}

        {confirmModal.isOpen && (

          <div className="admin-modal-overlay" style={{ zIndex: 2000 }}>
            <div className="admin-modal" style={{ maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '14px', letterSpacing: '0.2em', marginBottom: '20px' }}>CONFIRMATION</h3>
              <p style={{ fontSize: '14px', marginBottom: '30px', color: '#666', lineHeight: '1.5' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button 
                  className="admin-btn approve" 
                  style={{ padding: '10px 20px' }} 
                  onClick={confirmModal.onConfirm}
                >
                  PROCEED
                </button>
                <button 
                  className="admin-btn" 
                  style={{ padding: '10px 20px' }} 
                  onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

