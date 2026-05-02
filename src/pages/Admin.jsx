import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiGet, apiPost } from '../lib/api';
import HeaderBar from '../components/HeaderBar';
import EventsTab from '../components/admin/EventsTab';
import InquiriesTab from '../components/admin/InquiriesTab';
import ShopTab from '../components/admin/ShopTab';
import CommunityTab from '../components/admin/CommunityTab';
import './Admin.css';

export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [serviceInquiries, setServiceInquiries] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); 
  const [communityCredits, setCommunityCredits] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityTableMissing, setCommunityTableMissing] = useState(false);
  const [artistInterest, setArtistInterest] = useState([]);
  const [artistInterestLoading, setArtistInterestLoading] = useState(true);
  const [artistInterestTableMissing, setArtistInterestTableMissing] = useState(false);

  // Square catalog state
  const [squareItems, setSquareItems] = useState([]);
  const [fetchingCatalog, setFetchingCatalog] = useState(false);
  const [squareError, setSquareError] = useState(null);
  const [preorders, setPreorders] = useState([]);
  const [preordersLoading, setPreordersLoading] = useState(true);

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
    fetchTickets();
    fetchServiceInquiries();
    fetchCommunityCredits();
    fetchArtistInterest();
    fetchSquareCatalog();
    fetchPreorders();
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
    setTicketsLoading(true);
    try {
      const data = await apiGet('/api/admin-tickets', { auth: true });
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
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

  async function fetchArtistInterest() {
    setArtistInterestLoading(true);
    const { data, error } = await supabase
      .from('artist_interest')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching artist interest:', error);
      if (error.code === '42P01') setArtistInterestTableMissing(true);
      setArtistInterest([]);
    } else {
      setArtistInterestTableMissing(false);
      setArtistInterest(data || []);
    }
    setArtistInterestLoading(false);
  }

  async function fetchSquareCatalog() {
    setFetchingCatalog(true);
    setSquareError(null);
    try {
      const data = await apiGet('/api/square-catalog');
      setSquareItems(data.catalog);
    } catch (err) {
      console.error('Catalog fetch err:', err);
      setSquareError(err.message);
    } finally {
      setFetchingCatalog(false);
    }
  }

  async function fetchPreorders() {
    setPreordersLoading(true);
    const { data, error } = await supabase
      .from('merch_preorders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching preorders:', error);
    } else {
      setPreorders(data || []);
    }
    setPreordersLoading(false);
  }

  async function updateStatus(id, newStatus, requestRecord) {
    try {
      if (newStatus === 'approved') {
        await apiPost('/api/requests', { action: 'approve', requestId: id });
        fetchRequests();
        showToast(`Approved & email sent to ${requestRecord.customer_name}`);
      } else {
        await apiPost('/api/requests', { action: 'update', id, status: newStatus });
        fetchRequests();
        showToast(`Status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status: ' + error.message, 'error');
    }
  }

  async function deleteRequest(id) {
    triggerConfirm('Delete this request permanently?', async () => {
      try {
        await apiPost('/api/requests', { action: 'delete', id });
        fetchRequests();
        showToast('Request removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  async function updateServiceStatus(id, newStatus) {
    try {
      await apiPost('/api/service-inquiries', { action: 'update', id, status: newStatus });
      fetchServiceInquiries();
      showToast(`Inquiry marked as ${newStatus}`);
    } catch (error) {
      showToast('Failed to update: ' + error.message, 'error');
    }
  }

  async function updateArtistInterestStatus(id, newStatus) {
    try {
      await apiPost('/api/artist-interest', { action: 'update', id, status: newStatus });
      fetchArtistInterest();
      showToast(`Artist interest marked as ${newStatus}`);
    } catch (error) {
      showToast('Failed to update: ' + error.message, 'error');
    }
  }

  async function deleteArtistInterest(id) {
    triggerConfirm('Delete this artist interest entry permanently?', async () => {
      try {
        await apiPost('/api/artist-interest', { action: 'delete', id });
        fetchArtistInterest();
        showToast('Artist interest removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
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
          tickets={tickets}
          eventLoading={eventLoading}
          ticketsLoading={ticketsLoading}
          tableMissing={tableMissing}
          squareItems={squareItems}
          fetchingCatalog={fetchingCatalog}
          squareError={squareError}
          fetchEvents={fetchEvents}
          fetchTickets={fetchTickets}
          fetchRequests={fetchRequests}
          showToast={showToast}
          triggerConfirm={triggerConfirm}
          fetchSquareCatalog={fetchSquareCatalog}
          requests={requests}
          loading={loading}
          updateStatus={updateStatus}
          deleteRequest={deleteRequest}
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
          preorders={preorders}
          preordersLoading={preordersLoading}
          fetchPreorders={fetchPreorders}
          showToast={showToast}
          triggerConfirm={triggerConfirm}
        />
      )}

      {(activeTab === 'community' || activeTab === 'all') && (
        <CommunityTab 
          events={events}
          communityCredits={communityCredits}
          communityLoading={communityLoading}
          communityTableMissing={communityTableMissing}
          fetchCommunityCredits={fetchCommunityCredits}
          artistInterest={artistInterest}
          artistInterestLoading={artistInterestLoading}
          artistInterestTableMissing={artistInterestTableMissing}
          fetchArtistInterest={fetchArtistInterest}
          updateArtistInterestStatus={updateArtistInterestStatus}
          deleteArtistInterest={deleteArtistInterest}
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

      {/* Confirmation Notification */}
      {confirmModal && (
        <div className="admin-confirm-notification">
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
      )}
    </div>
  );
}
