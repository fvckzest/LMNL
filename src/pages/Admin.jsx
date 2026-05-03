import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiGet, apiPost } from '../lib/api';
import HeaderBar from '../components/HeaderBar';
import EventsTab from '../components/admin/EventsTab';
import InquiriesTab from '../components/admin/InquiriesTab';
import ContactTab from '../components/admin/ContactTab';
import ShopTab from '../components/admin/ShopTab';
import CommunityTab from '../components/admin/CommunityTab';
import BlogTab from '../components/admin/BlogTab';
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
  const [mailingList, setMailingList] = useState([]);
  const [mailingListLoading, setMailingListLoading] = useState(true);
  const [mailingListTableMissing, setMailingListTableMissing] = useState(false);
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogTableMissing, setBlogTableMissing] = useState(false);

  // Square catalog state
  const [squareItems, setSquareItems] = useState([]);
  const [fetchingCatalog, setFetchingCatalog] = useState(false);
  const [squareError, setSquareError] = useState(null);
  const [preorders, setPreorders] = useState([]);
  const [preordersLoading, setPreordersLoading] = useState(true);

  // Toast & Confirm Modals
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pinning state
  const [pinnedSections, setPinnedSections] = useState(() => {
    try {
      const saved = localStorage.getItem('lmnl_pinned_sections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePin = (sectionId) => {
    setPinnedSections(prev => {
      const next = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      localStorage.setItem('lmnl_pinned_sections', JSON.stringify(next));
      return next;
    });
  };

  const tabColors = {
    all: '#000000',
    events: '#004ffa',
    inquiries: '#6222d8',
    shop: '#ff0000',
    community: '#ff5bb8',
    contact: '#90e937',
    blog: '#ffde00'
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
    fetchMailingList();
    fetchBlogPosts();
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

  async function fetchMailingList() {
    setMailingListLoading(true);
    const { data, error } = await supabase
      .from('mailing_list')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mailing list:', error);
      if (error.code === '42P01') setMailingListTableMissing(true);
      setMailingList([]);
    } else {
      setMailingListTableMissing(false);
      setMailingList(data || []);
    }
    setMailingListLoading(false);
  }

  async function fetchBlogPosts() {
    setBlogLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
      if (error.code === '42P01') setBlogTableMissing(true);
      setBlogPosts([]);
    } else {
      setBlogTableMissing(false);
      setBlogPosts(data || []);
    }
    setBlogLoading(false);
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

  async function refreshAllData() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchRequests(),
        fetchEvents(),
        fetchTickets(),
        fetchServiceInquiries(),
        fetchCommunityCredits(),
        fetchArtistInterest(),
        fetchMailingList(),
        fetchSquareCatalog(),
        fetchPreorders(),
        fetchBlogPosts()
      ]);
      showToast('Dashboard Refreshed');
    } catch (error) {
      console.error('Refresh error:', error);
      showToast('Refresh failed', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updateStatus(id, newStatus, requestRecord) {
    try {
      if (newStatus === 'approved') {
        const result = await apiPost('/api/requests', { action: 'approve', requestId: id });
        fetchRequests();
        if (result.warning) {
          let copiedCheckoutLink = false;

          try {
            if (result.checkoutUrl && navigator?.clipboard?.writeText) {
              await navigator.clipboard.writeText(result.checkoutUrl);
              copiedCheckoutLink = true;
            }
          } catch (clipboardError) {
            console.warn('Unable to copy checkout link after approval warning:', clipboardError);
          }

          showToast(
            copiedCheckoutLink
              ? `${result.warning} Checkout link copied for ${requestRecord.customer_name}.`
              : `${result.warning} Please use the generated checkout link for ${requestRecord.customer_name}.`
          );
        } else {
          showToast(`Approved & email sent to ${requestRecord.customer_name}`);
        }
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

  async function deleteServiceInquiry(id) {
    triggerConfirm('Delete this service inquiry permanently?', async () => {
      try {
        await apiPost('/api/service-inquiries', { action: 'delete', id });
        fetchServiceInquiries();
        showToast('Inquiry removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content">
        <div className="page-header" style={{ left: 0, right: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="page-header-rect" style={{ backgroundColor: tabColors[activeTab] || '#000' }} />
            <h1 className="page-title">ADMIN</h1>
          </div>
          <div style={{ 
            position: 'absolute', 
            right: 'var(--lmnl-page-padding-inline)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <button 
              className="admin-btn logout-btn"
              onClick={handleSignOut}
            >
              LOG OUT
            </button>
            <button 
              className={`admin-btn admin-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              onClick={refreshAllData}
              disabled={isRefreshing}
              title="Refresh all data"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={isRefreshing ? 'refresh-spin' : ''}
              >
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH'}</span>
            </button>
          </div>
        </div>
        
        <div className="admin-body">
        
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')} 
            style={{ borderBottomColor: tabColors.all, '--tab-accent': tabColors.all }}
          >
            ALL
          </button>
          <button 
            className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`} 
            onClick={() => setActiveTab('events')} 
            style={{ borderBottomColor: tabColors.events, '--tab-accent': tabColors.events }}
          >
            EVENTS
          </button>
          <button 
            className={`admin-tab ${activeTab === 'inquiries' ? 'active' : ''}`} 
            onClick={() => setActiveTab('inquiries')} 
            style={{ borderBottomColor: tabColors.inquiries, '--tab-accent': tabColors.inquiries }}
          >
            INQUIRIES
          </button>
          <button 
            className={`admin-tab ${activeTab === 'shop' ? 'active' : ''}`} 
            onClick={() => setActiveTab('shop')} 
            style={{ borderBottomColor: tabColors.shop, '--tab-accent': tabColors.shop }}
          >
            SHOP
          </button>
          <button 
            className={`admin-tab ${activeTab === 'community' ? 'active' : ''}`} 
            onClick={() => setActiveTab('community')} 
            style={{ borderBottomColor: tabColors.community, '--tab-accent': tabColors.community }}
          >
            COMMUNITY
          </button>
          <button 
            className={`admin-tab ${activeTab === 'contact' ? 'active' : ''}`} 
            onClick={() => setActiveTab('contact')} 
            style={{ borderBottomColor: tabColors.contact, '--tab-accent': tabColors.contact }}
          >
            CONTACT
          </button>
          <button 
            className={`admin-tab ${activeTab === 'blog' ? 'active' : ''}`} 
            onClick={() => setActiveTab('blog')} 
            style={{ borderBottomColor: tabColors.blog, '--tab-accent': tabColors.blog }}
          >
            BLOG
          </button>
        </div>

      {/* Pinned Sections (Only visible in 'all' tab) */}
      {activeTab === 'all' && pinnedSections.length > 0 && (
        <div className="pinned-sections-container">
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
            pinnedSections={pinnedSections}
            onTogglePin={togglePin}
            renderMode="pinned"
          />
          <InquiriesTab 
            serviceInquiries={serviceInquiries.filter(iq => !iq.selected_services?.includes('general'))}
            servicesLoading={servicesLoading}
            updateServiceStatus={updateServiceStatus}
            deleteServiceInquiry={deleteServiceInquiry}
            pinnedSections={pinnedSections}
            onTogglePin={togglePin}
            renderMode="pinned"
          />
          <ContactTab 
            contactInquiries={serviceInquiries.filter(iq => iq.selected_services?.includes('general'))}
            loading={servicesLoading}
            updateStatus={updateServiceStatus}
            deleteInquiry={deleteServiceInquiry}
            pinnedSections={pinnedSections}
            onTogglePin={togglePin}
            renderMode="pinned"
          />
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
            tickets={tickets}
            events={events}
            pinnedSections={pinnedSections}
            onTogglePin={togglePin}
            renderMode="pinned"
          />
          <CommunityTab 
            events={events}
            communityCredits={communityCredits}
            communityLoading={communityLoading}
            communityTableMissing={communityTableMissing}
            fetchCommunityCredits={fetchCommunityCredits}
            requests={requests}
            requestsLoading={loading}
            tickets={tickets}
            ticketsLoading={ticketsLoading}
            serviceInquiries={serviceInquiries}
            servicesLoading={servicesLoading}
            artistInterest={artistInterest}
            artistInterestLoading={artistInterestLoading}
            artistInterestTableMissing={artistInterestTableMissing}
            fetchArtistInterest={fetchArtistInterest}
            mailingList={mailingList}
            mailingListLoading={mailingListLoading}
            mailingListTableMissing={mailingListTableMissing}
            fetchMailingList={fetchMailingList}
            updateArtistInterestStatus={updateArtistInterestStatus}
            deleteArtistInterest={deleteArtistInterest}
            showToast={showToast}
            triggerConfirm={triggerConfirm}
            pinnedSections={pinnedSections}
            onTogglePin={togglePin}
            renderMode="pinned"
          />
          <BlogTab 
            blogPosts={blogPosts}
            blogLoading={blogLoading}
            blogTableMissing={blogTableMissing}
            fetchBlogPosts={fetchBlogPosts}
            showToast={showToast}
            triggerConfirm={triggerConfirm}
            pinnedSections={pinnedSections}
            onTogglePin={togglePin}
            renderMode="pinned"
          />
          <div className="pinned-divider" style={{ 
            height: '1px', 
            background: '#eee', 
            margin: '40px 0',
            position: 'relative'
          }}>
            <span style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              background: '#fff',
              padding: '0 20px',
              fontSize: '10px',
              color: '#999',
              letterSpacing: '0.2em'
            }}>END OF PINNED SECTIONS</span>
          </div>
        </div>
      )}

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
          pinnedSections={pinnedSections}
          onTogglePin={togglePin}
          renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
        />
      )}

      {(activeTab === 'inquiries' || activeTab === 'all') && (
        <InquiriesTab 
          serviceInquiries={serviceInquiries.filter(iq => !iq.selected_services?.includes('general'))}
          servicesLoading={servicesLoading}
          updateServiceStatus={updateServiceStatus}
          deleteServiceInquiry={deleteServiceInquiry}
          pinnedSections={pinnedSections}
          onTogglePin={togglePin}
          renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
        />
      )}

      {(activeTab === 'contact' || activeTab === 'all') && (
        <ContactTab 
          contactInquiries={serviceInquiries.filter(iq => iq.selected_services?.includes('general'))}
          loading={servicesLoading}
          updateStatus={updateServiceStatus}
          deleteInquiry={deleteServiceInquiry}
          pinnedSections={pinnedSections}
          onTogglePin={togglePin}
          renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
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
          tickets={tickets}
          events={events}
          pinnedSections={pinnedSections}
          onTogglePin={togglePin}
          renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
        />
      )}

      {(activeTab === 'community' || activeTab === 'all') && (
        <CommunityTab 
          events={events}
          communityCredits={communityCredits}
          communityLoading={communityLoading}
          communityTableMissing={communityTableMissing}
          fetchCommunityCredits={fetchCommunityCredits}
          requests={requests}
          requestsLoading={loading}
          tickets={tickets}
          ticketsLoading={ticketsLoading}
          serviceInquiries={serviceInquiries}
          servicesLoading={servicesLoading}
          artistInterest={artistInterest}
          artistInterestLoading={artistInterestLoading}
          artistInterestTableMissing={artistInterestTableMissing}
          fetchArtistInterest={fetchArtistInterest}
          mailingList={mailingList}
          mailingListLoading={mailingListLoading}
          mailingListTableMissing={mailingListTableMissing}
          fetchMailingList={fetchMailingList}
          updateArtistInterestStatus={updateArtistInterestStatus}
          deleteArtistInterest={deleteArtistInterest}
          showToast={showToast}
          triggerConfirm={triggerConfirm}
          pinnedSections={pinnedSections}
          onTogglePin={togglePin}
          renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
        />
      )}

      {(activeTab === 'blog' || activeTab === 'all') && (
        <BlogTab 
          blogPosts={blogPosts}
          blogLoading={blogLoading}
          blogTableMissing={blogTableMissing}
          fetchBlogPosts={fetchBlogPosts}
          showToast={showToast}
          triggerConfirm={triggerConfirm}
          pinnedSections={pinnedSections}
          onTogglePin={togglePin}
          renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
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
