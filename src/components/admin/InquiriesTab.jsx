import { useState, Fragment } from 'react';
import { ArchiveIcon, UnarchiveIcon, TrashIcon, PinIcon } from './Icons';
import ServiceProductsPanel from './ServiceProductsPanel';

 export default function InquiriesTab({
   serviceInquiries,
   servicesLoading,
   updateServiceStatus,
   deleteServiceInquiry,
   serviceProducts,
   serviceProductsLoading,
   serviceProductsTableMissing,
   fetchServiceProducts,
   showToast,
   triggerConfirm,
   pinnedSections = [],
   onTogglePin = () => {},
   renderMode = 'all'
 }) {
   const sectionId = 'service_inquiries';

   const shouldRender = () => {
     if (renderMode === 'all') return true;
     const isPinned = pinnedSections.includes(sectionId);
     if (renderMode === 'pinned') return isPinned;
     if (renderMode === 'unpinned') return !isPinned;
     return true;
   };

   const [showArchivedServices, setShowArchivedServices] = useState(false);
   const [expandedInquiries, setExpandedInquiries] = useState({});

   function toggleInquiryExpansion(id) {
     setExpandedInquiries(prev => ({
       ...prev,
       [id]: !prev[id]
     }));
   }

   return shouldRender() ? (
    <section className="admin-section" style={{ '--active-tab-color': '#6222d8' }}>
      <div className="section-title-container">
        <button 
          className={`pin-toggle-btn ${pinnedSections.includes(sectionId) ? 'pinned' : ''}`}
          onClick={() => onTogglePin(sectionId)}
          title={pinnedSections.includes(sectionId) ? 'Unpin from top' : 'Pin to top'}
        >
          <PinIcon filled={pinnedSections.includes(sectionId)} />
        </button>
        <h2 className="section-title">SERVICE INQUIRIES</h2>
      </div>
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

      <div className="requests-table-container admin-table-shell">
        {servicesLoading ? (
          <p className="loading-text">RETRIEVING DATA...</p>
        ) : serviceInquiries.length === 0 ? (
          <p className="loading-text">NO SERVICE INQUIRIES FOUND.</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>NAME / ENTITY</th>
                <th>EMAIL</th>
                <th>SERVICES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {serviceInquiries
                .filter(req => showArchivedServices ? true : req.status !== 'archived')
                .map((req) => {
                  const isExpanded = Boolean(expandedInquiries[req.id]);
                  return (
                    <Fragment key={req.id}>
                      <tr className={`${isExpanded ? 'inquiry-row-expanded' : ''} status-${req.status}`}>
                        <td className="ticket-detail-toggle-cell">
                          <button
                            type="button"
                            className={`ticket-detail-toggle ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleInquiryExpansion(req.id)}
                            aria-expanded={isExpanded}
                            title={isExpanded ? 'Hide details' : 'Show details'}
                            style={{ '--004ffa': '#6222d8' }} 
                          >
                            <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#6222d8' }}>▶</span>
                          </button>
                        </td>
                        <td><strong>{req.name}</strong></td>
                        <td>
                          <a href={`mailto:${req.email}`} className="event-name-link">
                            {req.email}
                          </a>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {Array.isArray(req.selected_services) && req.selected_services.map(s => (
                              <span key={s} className="status-pill active">
                                {s.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>
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
                              <button
                                className="icon-btn delete-btn"
                                title="Delete Inquiry"
                                onClick={() => deleteServiceInquiry(req.id)}
                                style={{ color: '#991b1b' }}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="inquiry-metadata-row">
                          <td></td>
                          <td colSpan="5">
                            <div className="inquiry-metadata-panel" style={{ padding: '15px 0', borderLeft: '2px solid #6222d8' }}>
                              <div className="inquiry-metadata-grid" style={{ paddingLeft: '15px' }}>
                                <div className="inquiry-metadata-item" style={{ marginBottom: '15px' }}>
                                  <span className="inquiry-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>INQUIRY DATE</span>
                                  <span className="inquiry-metadata-value" style={{ fontWeight: 600 }}>{new Date(req.created_at).toLocaleString()}</span>
                                </div>
                                <div className="inquiry-metadata-item">
                                  <span className="inquiry-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PROJECT BRIEF / NOTES</span>
                                  <div className="inquiry-metadata-value" style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    fontSize: '13px', 
                                    lineHeight: '1.6', 
                                    color: '#333',
                                    background: '#f9f9f9',
                                    padding: '12px',
                                    border: '1px solid #eee'
                                  }}>
                                    {req.notes || 'No project notes provided.'}
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

      <div className="section-title-container" style={{ marginTop: '18px' }}>
        <h2 className="section-title">PRODUCT TABLE OFFERINGS</h2>
      </div>
      <ServiceProductsPanel
        serviceProducts={serviceProducts}
        serviceProductsLoading={serviceProductsLoading}
        serviceProductsTableMissing={serviceProductsTableMissing}
        fetchServiceProducts={fetchServiceProducts}
        showToast={showToast}
        triggerConfirm={triggerConfirm}
      />
     </section>
  ) : null;
}
