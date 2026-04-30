import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import HeaderBar from '../components/HeaderBar';
import EventsTab from '../components/admin/EventsTab';
import InquiriesTab from '../components/admin/InquiriesTab';
import ShopTab from '../components/admin/ShopTab';
import CommunityTab from '../components/admin/CommunityTab';
import './Admin.css';

export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [serviceInquiries, setServiceInquiries] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); 
  const [tickets, setTickets] = useState([]);
  const [communityCredits, setCommunityCredits] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityTableMissing, setCommunityTableMissing] = useState(false);

  // Square catalog state
  const [squareItems, setSquareItems] = useState([]);
  const [fetchingCatalog, setFetchingCatalog] = useState(false);
  const [squareError, setSquareError] = useState(null);

  // Toast & Confirm Modals
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const tabColors = {
    all: '#000000',
    events: '#004ffa',
    inquiries: '#6222d8',
    shop: '#ff0000',
    community: '#ff5bb8'
  };

  useEffect(() => {
    fetchRequests();
    fetchEvents();
    fetchServiceInquiries();
    fetchTickets();
    fetchCommunityCredits();
    fetchSquareCatalog();
  }, []);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function triggerConfirm(message, onConfirm) {
    setConfirmModal({ message, onConfirm });
  }

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching requests:', error);
    else setRequests(data || []);
    setLoading(false);
  }

  async function fetchEvents() {
    setEventLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching events:', error);
      if (error.code === '42P01') setTableMissing(true);
    } else {
      setEvents(data || []);
    }
    setEventLoading(false);
  }

  async function fetchTickets() {
    const { data, error } = await supabase
      .from('tickets')
      .select('*');
    if (!error) setTickets(data || []);
  }

  async function fetchServiceInquiries() {
    setServicesLoading(true);
    const { data, error } = await supabase
      .from('service_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching inquiries:', error);
    else setServiceInquiries(data || []);
    setServicesLoading(false);
  }

  async function fetchCommunityCredits() {
    setCommunityLoading(true);
    const { data, error } = await supabase
      .from('community_credits')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching community credits:', error);
      if (error.code === '42P01') setCommunityTableMissing(true);
      setCommunityCredits([]);
    } else {
      setCommunityCredits(data || []);
    }
    setCommunityLoading(false);
  }

  async function fetchSquareCatalog() {
    setFetchingCatalog(true);
    setSquareError(null);
    try {
      const response = await fetch('/api/square-catalog');
      const data = await response.json();
      if (data.success) setSquareItems(data.catalog);
      else throw new Error(data.error);
    } catch (err) {
      console.error('Catalog fetch err:', err);
      setSquareError(err.message);
    } finally {
      setFetchingCatalog(false);
    }
  }

  async function updateStatus(id, newStatus, requestRecord) {
    const { error } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status: ' + error.message, 'error');
    } else {
      fetchRequests();
      if (newStatus === 'approved') {
        try {
          const response = await fetch('/api/send-approval-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: id,
              customerEmail: requestRecord.customer_email,
              customerName: requestRecord.customer_name,
              eventName: requestRecord.event_name
            })
          });
          const result = await response.json();
          if (result.success) showToast(`Approved & email sent to ${requestRecord.customer_name}`);
          else throw new Error(result.error);
        } catch (err) {
          showToast(`Approved, but email failed: ${err.message}`, 'error');
        }
      } else {
        showToast(`Status updated to ${newStatus}`);
      }
    }
  }

  async function deleteRequest(id) {
    triggerConfirm('Delete this request permanently?', async () => {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (error) showToast('Delete failed: ' + error.message, 'error');
      else {
        fetchRequests();
        showToast('Request removed.');
      }
    });
  }

  async function updateServiceStatus(id, newStatus) {
    const { error } = await supabase
      .from('service_inquiries')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      showToast('Failed to update: ' + error.message, 'error');
    } else {
      fetchServiceInquiries();
      showToast(`Inquiry marked as ${newStatus}`);
    }
  }

  function hasBoughtTicket(request) {
    const matchedEvent = events.find(e => e.name === request.event_name);
    if (!matchedEvent) return false;
    
    return tickets.some(ticket => 
      ticket.event_id === matchedEvent.id && 
      ticket.customer_email?.toLowerCase() === request.customer_email?.toLowerCase()
    );
  }

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: tabColors[activeTab] || '#000' }} />
          <h1 className="page-title">ADMIN</h1>
        </div>
        
        <div className="admin-body">
        
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')} 
            style={{ borderBottomColor: activeTab === 'all' ? tabColors.all : 'transparent' }}
          >
            ALL
          </button>
          <button 
            className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`} 
            onClick={() => setActiveTab('events')} 
            style={{ borderBottomColor: activeTab === 'events' ? tabColors.events : 'transparent' }}
          >
            EVENTS
          </button>
          <button 
            className={`admin-tab ${activeTab === 'inquiries' ? 'active' : ''}`} 
            onClick={() => setActiveTab('inquiries')} 
            style={{ borderBottomColor: activeTab === 'inquiries' ? tabColors.inquiries : 'transparent' }}
          >
            INQUIRIES
          </button>
          <button 
            className={`admin-tab ${activeTab === 'shop' ? 'active' : ''}`} 
            onClick={() => setActiveTab('shop')} 
            style={{ borderBottomColor: activeTab === 'shop' ? tabColors.shop : 'transparent' }}
          >
            SHOP
          </button>
          <button 
            className={`admin-tab ${activeTab === 'community' ? 'active' : ''}`} 
            onClick={() => setActiveTab('community')} 
            style={{ borderBottomColor: activeTab === 'community' ? tabColors.community : 'transparent' }}
          >
            COMMUNITY
          </button>
        </div>

      {(activeTab === 'events' || activeTab === 'all') && (
        <EventsTab 
          events={events}
          eventLoading={eventLoading}
          tableMissing={tableMissing}
          squareItems={squareItems}
          fetchingCatalog={fetchingCatalog}
          squareError={squareError}
          fetchEvents={fetchEvents}
          fetchRequests={fetchRequests}
          showToast={showToast}
          triggerConfirm={triggerConfirm}
          fetchSquareCatalog={fetchSquareCatalog}
          requests={requests}
          loading={loading}
          tickets={tickets}
          updateStatus={updateStatus}
          deleteRequest={deleteRequest}
          hasBoughtTicket={hasBoughtTicket}
        />
      )}

      {(activeTab === 'inquiries' || activeTab === 'all') && (
        <InquiriesTab 
          serviceInquiries={serviceInquiries}
          servicesLoading={servicesLoading}
          updateServiceStatus={updateServiceStatus}
        />
      )}

      {(activeTab === 'shop' || activeTab === 'all') && (
        <ShopTab 
          squareItems={squareItems}
          fetchingCatalog={fetchingCatalog}
          squareError={squareError}
          fetchSquareCatalog={fetchSquareCatalog}
        />
      )}

      {(activeTab === 'community' || activeTab === 'all') && (
        <CommunityTab 
          events={events}
          communityCredits={communityCredits}
          communityLoading={communityLoading}
          communityTableMissing={communityTableMissing}
          fetchCommunityCredits={fetchCommunityCredits}
          showToast={showToast}
          triggerConfirm={triggerConfirm}
        />
      )}
      </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.message.toUpperCase()}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal confirm-modal">
            <div className="modal-header">
              <h3>CONFIRM ACTION</h3>
            </div>
            <p className="confirm-message">{confirmModal.message}</p>
            <div className="modal-actions">
              <button 
                className="admin-btn cancel"
                onClick={() => setConfirmModal(null)}
              >
                CANCEL
              </button>
              <button 
                className="admin-btn approve"
                onClick={async () => {
                  const callback = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await callback();
                }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
