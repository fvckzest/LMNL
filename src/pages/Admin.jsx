import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiGet, apiPost } from '../lib/api';
import ContentPageShell from '../components/ContentPageShell';
import RouteStatusScreen from '../components/RouteStatusScreen';
import { useThemeNeutralColor } from '../components/ThemeProvider';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import './Admin.css';

const EventsTab = lazyWithRetry(() => import('../components/admin/EventsTab'));
const InquiriesTab = lazyWithRetry(() => import('../components/admin/InquiriesTab'));
const ContactTab = lazyWithRetry(() => import('../components/admin/ContactTab'));
const ShopTab = lazyWithRetry(() => import('../components/admin/ShopTab'));
const CommunityTab = lazyWithRetry(() => import('../components/admin/CommunityTab'));
const BlogTab = lazyWithRetry(() => import('../components/admin/BlogTab'));

const DEFAULT_TAB = 'events';

const TAB_DATASETS = {
  all: ['requests', 'events', 'tickets', 'serviceInquiries', 'serviceProducts', 'communityCredits', 'attendanceQueue', 'artistInterest', 'mailingList', 'blogPosts', 'preorders', 'squareCatalog'],
  events: ['requests', 'events', 'tickets'],
  inquiries: ['serviceInquiries', 'serviceProducts'],
  contact: ['serviceInquiries'],
  shop: ['preorders', 'squareCatalog', 'events', 'tickets'],
  community: ['communityCredits', 'attendanceQueue', 'artistInterest', 'mailingList', 'events', 'requests', 'tickets', 'serviceInquiries'],
  blog: ['blogPosts'],
};

const PINNED_SECTION_DATASETS = {
  events_mgmt: ['events', 'tickets'],
  invite_reqs: ['requests'],
  service_inquiries: ['serviceInquiries', 'serviceProducts'],
  contact_inquiries: ['serviceInquiries'],
  merch_preorders: ['preorders', 'events', 'tickets'],
  square_catalog: ['squareCatalog'],
  attendance_queue: ['attendanceQueue'],
  artist_interest: ['artistInterest'],
  community_credits: ['communityCredits', 'events'],
  mailing_list: ['mailingList'],
  blog_posts: ['blogPosts'],
};

function readInitialActiveTab() {
  if (typeof window === 'undefined') {
    return DEFAULT_TAB;
  }

  try {
    const saved = localStorage.getItem('lmnl_admin_active_tab');
    return saved || DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

function getDatasetsForView(activeTab, pinnedSections) {
  const datasetKeys = new Set(TAB_DATASETS[activeTab] || TAB_DATASETS[DEFAULT_TAB]);

  if (activeTab === 'all') {
    pinnedSections.forEach((sectionId) => {
      (PINNED_SECTION_DATASETS[sectionId] || []).forEach((dataset) => datasetKeys.add(dataset));
    });
  }

  return [...datasetKeys];
}

function AdminTabFallback() {
  return <RouteStatusScreen message="LOADING MODULE..." />;
}

export default function Admin() {
  const neutralColor = useThemeNeutralColor();
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [serviceInquiries, setServiceInquiries] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceProducts, setServiceProducts] = useState([]);
  const [serviceProductsLoading, setServiceProductsLoading] = useState(true);
  const [serviceProductsTableMissing, setServiceProductsTableMissing] = useState(false);
  const [activeTab, setActiveTab] = useState(readInitialActiveTab);
  const [communityCredits, setCommunityCredits] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityTableMissing, setCommunityTableMissing] = useState(false);
  const [attendanceQueue, setAttendanceQueue] = useState([]);
  const [attendanceQueueLoading, setAttendanceQueueLoading] = useState(true);
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
  const loadedDatasetsRef = useRef(new Set());
  const inflightDatasetsRef = useRef(new Set());
  const loadDatasetsRef = useRef(async () => {});

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

  const tabOptions = [
    { id: 'all', label: 'ALL' },
    { id: 'events', label: 'EVENTS' },
    { id: 'inquiries', label: 'SERVICES' },
    { id: 'shop', label: 'SHOP' },
    { id: 'community', label: 'COMMUNITY' },
    { id: 'contact', label: 'CONTACT' },
    { id: 'blog', label: 'BLOG' },
  ];

  useEffect(() => {
    try {
      localStorage.setItem('lmnl_admin_active_tab', activeTab);
    } catch {
      // Ignore persistence issues for local admin preferences.
    }
  }, [activeTab]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function triggerConfirm(message, onConfirm) {
    setConfirmModal({ message, onConfirm });
  }

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await apiGet('/api/requests', { auth: true });
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvents() {
    setEventLoading(true);
    try {
      const data = await apiGet('/api/events', { auth: true });
      setTableMissing(false);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        setTableMissing(true);
      }
      setEvents([]);
    } finally {
      setEventLoading(false);
    }
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
    try {
      const data = await apiGet('/api/service-inquiries', { auth: true });
      setServiceInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setServiceInquiries([]);
    } finally {
      setServicesLoading(false);
    }
  }

  async function fetchServiceProducts() {
    setServiceProductsLoading(true);
    try {
      const data = await apiGet('/api/service-products', { auth: true });
      setServiceProductsTableMissing(false);
      setServiceProducts(data || []);
    } catch (error) {
      console.error('Error fetching service products:', error);
      if (error.message?.includes('not set up yet')) setServiceProductsTableMissing(true);
      setServiceProducts([]);
    } finally {
      setServiceProductsLoading(false);
    }
  }

  async function fetchCommunityCredits() {
    setCommunityLoading(true);
    try {
      const data = await apiGet('/api/community-credits', { auth: true });
      setCommunityTableMissing(false);
      setCommunityCredits(data || []);
    } catch (error) {
      console.error('Error fetching community credits:', error);
      if (error.message?.includes('not set up yet')) setCommunityTableMissing(true);
      setCommunityCredits([]);
    } finally {
      setCommunityLoading(false);
    }
  }

  async function fetchAttendanceQueue() {
    setAttendanceQueueLoading(true);
    try {
      const data = await apiGet('/api/admin-attendance-sources', { auth: true });
      setAttendanceQueue(data?.items || []);
    } catch (error) {
      console.error('Error fetching attendance queue:', error);
      setAttendanceQueue([]);
    } finally {
      setAttendanceQueueLoading(false);
    }
  }

  async function fetchArtistInterest() {
    setArtistInterestLoading(true);
    try {
      const data = await apiGet('/api/artist-interest', { auth: true });
      setArtistInterestTableMissing(false);
      setArtistInterest(data || []);
    } catch (error) {
      console.error('Error fetching artist interest:', error);
      if (error.message?.includes('not set up yet')) setArtistInterestTableMissing(true);
      setArtistInterest([]);
    } finally {
      setArtistInterestLoading(false);
    }
  }

  async function fetchMailingList() {
    setMailingListLoading(true);
    try {
      const data = await apiGet('/api/mailing-list', { auth: true });
      setMailingListTableMissing(false);
      setMailingList(data || []);
    } catch (error) {
      console.error('Error fetching mailing list:', error);
      if (error.message?.includes('not set up yet')) setMailingListTableMissing(true);
      setMailingList([]);
    } finally {
      setMailingListLoading(false);
    }
  }

  async function fetchBlogPosts() {
    setBlogLoading(true);
    try {
      const data = await apiGet('/api/blog-posts', { auth: true });
      setBlogTableMissing(false);
      setBlogPosts(data || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      if (error.message?.includes('not set up yet')) setBlogTableMissing(true);
      setBlogPosts([]);
    } finally {
      setBlogLoading(false);
    }
  }

  async function fetchSquareCatalog() {
    setFetchingCatalog(true);
    setSquareError(null);
    try {
      const data = await apiGet('/api/square-catalog', { auth: true });
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
    try {
      const data = await apiGet('/api/preorders', { auth: true });
      setPreorders(data || []);
    } catch (error) {
      console.error('Error fetching preorders:', error);
      setPreorders([]);
    } finally {
      setPreordersLoading(false);
    }
  }

  loadDatasetsRef.current = async (datasetNames, { force = false } = {}) => {
    const datasetLoaders = {
      requests: fetchRequests,
      events: fetchEvents,
      tickets: fetchTickets,
      serviceInquiries: fetchServiceInquiries,
      serviceProducts: fetchServiceProducts,
      communityCredits: fetchCommunityCredits,
      attendanceQueue: fetchAttendanceQueue,
      artistInterest: fetchArtistInterest,
      mailingList: fetchMailingList,
      blogPosts: fetchBlogPosts,
      squareCatalog: fetchSquareCatalog,
      preorders: fetchPreorders,
    };

    const pendingLoads = datasetNames
      .filter(Boolean)
      .filter((name) => {
        if (!force && loadedDatasetsRef.current.has(name)) {
          return false;
        }

        if (inflightDatasetsRef.current.has(name)) {
          return false;
        }

        return Boolean(datasetLoaders[name]);
      });

    if (pendingLoads.length === 0) {
      return;
    }

    pendingLoads.forEach((name) => inflightDatasetsRef.current.add(name));

    await Promise.allSettled(
      pendingLoads.map(async (name) => {
        try {
          await datasetLoaders[name]();
          loadedDatasetsRef.current.add(name);
        } finally {
          inflightDatasetsRef.current.delete(name);
        }
      })
    );
  };

  useEffect(() => {
    loadDatasetsRef.current(getDatasetsForView(activeTab, pinnedSections));
  }, [activeTab, pinnedSections]);

  async function refreshVisibleData() {
    setIsRefreshing(true);
    try {
      await loadDatasetsRef.current(getDatasetsForView(activeTab, pinnedSections), { force: true });
      showToast(activeTab === 'all' ? 'All visible modules refreshed' : `${activeTab.toUpperCase()} refreshed`);
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
        const result = await apiPost('/api/requests', { action: 'approve', requestId: id }, { auth: true });
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
        await apiPost('/api/requests', { action: 'update', id, status: newStatus }, { auth: true });
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
        await apiPost('/api/requests', { action: 'delete', id }, { auth: true });
        fetchRequests();
        showToast('Request removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  async function updateServiceStatus(id, newStatus) {
    try {
      await apiPost('/api/service-inquiries', { action: 'update', id, status: newStatus }, { auth: true });
      fetchServiceInquiries();
      showToast(`Inquiry marked as ${newStatus}`);
    } catch (error) {
      showToast('Failed to update: ' + error.message, 'error');
    }
  }

  async function deleteServiceInquiry(id) {
    triggerConfirm('Delete this service inquiry permanently?', async () => {
      try {
        await apiPost('/api/service-inquiries', { action: 'delete', id }, { auth: true });
        fetchServiceInquiries();
        showToast('Inquiry removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  async function updateArtistInterestStatus(id, newStatus) {
    try {
      await apiPost('/api/artist-interest', { action: 'update', id, status: newStatus }, { auth: true });
      fetchArtistInterest();
      showToast(`Artist interest marked as ${newStatus}`);
    } catch (error) {
      showToast('Failed to update: ' + error.message, 'error');
    }
  }

  async function deleteArtistInterest(id) {
    triggerConfirm('Delete this artist interest entry permanently?', async () => {
      try {
        await apiPost('/api/artist-interest', { action: 'delete', id }, { auth: true });
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

  const activeColor = tabColors[activeTab] || '#000000';
  const serviceOnlyInquiries = serviceInquiries.filter((iq) => !iq.selected_services?.includes('general'));
  const contactOnlyInquiries = serviceInquiries.filter((iq) => iq.selected_services?.includes('general'));

  const introActions = (
    <div className="admin-toolbar admin-toolbar--hero">
      <button
        type="button"
        className={`admin-btn admin-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
        onClick={refreshVisibleData}
        disabled={isRefreshing}
        title={activeTab === 'all' ? 'Refresh visible data' : `Refresh ${activeTab} data`}
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
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH VIEW'}</span>
      </button>
      <button
        type="button"
        className="admin-btn logout-btn"
        onClick={handleSignOut}
      >
        LOG OUT
      </button>
    </div>
  );

  return (
    <>
      <ContentPageShell
        title="ADMIN"
        color={activeColor}
        introAccentColor={neutralColor}
        introLabel="CONTROL NODE"
        introTitle="Admin"
        introCopy="Operations surface for events, inquiries, inventory, editorial, and community records."
        introActions={introActions}
        contentClassName="admin-content page-stack"
      >
        <section
          className="admin-shell-panel page-panel admin-shell-panel--routed"
          style={{ '--admin-shell-accent': activeColor }}
        >
          <div className="admin-tabs">
            {tabOptions.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ '--tab-accent': tabColors[tab.id] }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Pinned Sections (Only visible in 'all' tab) */}
        {activeTab === 'all' && pinnedSections.length > 0 && (
          <div className="pinned-sections-container">
            <Suspense fallback={<AdminTabFallback />}>
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
                serviceInquiries={serviceOnlyInquiries}
                servicesLoading={servicesLoading}
                updateServiceStatus={updateServiceStatus}
                deleteServiceInquiry={deleteServiceInquiry}
                serviceProducts={serviceProducts}
                serviceProductsLoading={serviceProductsLoading}
                serviceProductsTableMissing={serviceProductsTableMissing}
                fetchServiceProducts={fetchServiceProducts}
                showToast={showToast}
                triggerConfirm={triggerConfirm}
                pinnedSections={pinnedSections}
                onTogglePin={togglePin}
                renderMode="pinned"
              />
              <ContactTab
                contactInquiries={contactOnlyInquiries}
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
                attendanceQueue={attendanceQueue}
                attendanceQueueLoading={attendanceQueueLoading}
                fetchAttendanceQueue={fetchAttendanceQueue}
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
            </Suspense>
            <div className="pinned-divider">
              <span className="pinned-divider__label">End Of Pinned Sections</span>
            </div>
          </div>
        )}

        {(activeTab === 'events' || activeTab === 'all') && (
          <Suspense fallback={<AdminTabFallback />}>
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
          </Suspense>
        )}

        {(activeTab === 'inquiries' || activeTab === 'all') && (
          <Suspense fallback={<AdminTabFallback />}>
            <InquiriesTab
              serviceInquiries={serviceOnlyInquiries}
              servicesLoading={servicesLoading}
              updateServiceStatus={updateServiceStatus}
              deleteServiceInquiry={deleteServiceInquiry}
              serviceProducts={serviceProducts}
              serviceProductsLoading={serviceProductsLoading}
              serviceProductsTableMissing={serviceProductsTableMissing}
              fetchServiceProducts={fetchServiceProducts}
              showToast={showToast}
              triggerConfirm={triggerConfirm}
              pinnedSections={pinnedSections}
              onTogglePin={togglePin}
              renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
            />
          </Suspense>
        )}

        {(activeTab === 'contact' || activeTab === 'all') && (
          <Suspense fallback={<AdminTabFallback />}>
            <ContactTab
              contactInquiries={contactOnlyInquiries}
              loading={servicesLoading}
              updateStatus={updateServiceStatus}
              deleteInquiry={deleteServiceInquiry}
              pinnedSections={pinnedSections}
              onTogglePin={togglePin}
              renderMode={activeTab === 'all' ? 'unpinned' : 'all'}
            />
          </Suspense>
        )}

        {(activeTab === 'shop' || activeTab === 'all') && (
          <Suspense fallback={<AdminTabFallback />}>
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
          </Suspense>
        )}

        {(activeTab === 'community' || activeTab === 'all') && (
          <Suspense fallback={<AdminTabFallback />}>
            <CommunityTab
              events={events}
              communityCredits={communityCredits}
              communityLoading={communityLoading}
              communityTableMissing={communityTableMissing}
              fetchCommunityCredits={fetchCommunityCredits}
              attendanceQueue={attendanceQueue}
              attendanceQueueLoading={attendanceQueueLoading}
              fetchAttendanceQueue={fetchAttendanceQueue}
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
          </Suspense>
        )}

        {(activeTab === 'blog' || activeTab === 'all') && (
          <Suspense fallback={<AdminTabFallback />}>
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
          </Suspense>
        )}
      </ContentPageShell>

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
    </>
  );
}
