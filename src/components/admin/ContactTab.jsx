import { useState, Fragment } from 'react';
import { ArchiveIcon, UnarchiveIcon, TrashIcon, PinIcon } from './Icons';

 export default function ContactTab({
   contactInquiries,
   loading,
   updateStatus,
   deleteInquiry,
   pinnedSections = [],
   onTogglePin = () => {},
   renderMode = 'all'
 }) {
   const sectionId = 'contact_inquiries';

   const shouldRender = () => {
     if (renderMode === 'all') return true;
     const isPinned = pinnedSections.includes(sectionId);
     if (renderMode === 'pinned') return isPinned;
     if (renderMode === 'unpinned') return !isPinned;
     return true;
   };

   const [showArchived, setShowArchived] = useState(false);
   const [expandedInquiries, setExpandedInquiries] = useState({});

   function toggleExpansion(id) {
     setExpandedInquiries(prev => ({
       ...prev,
       [id]: !prev[id]
     }));
   }

  // Filter inquiries
  const filteredInquiries = contactInquiries.filter(iq => 
    showArchived ? true : iq.status !== 'archived'
  );

   return shouldRender() ? (
    <section className="admin-section" style={{ '--active-tab-color': '#90e937' }}>
      <div className="section-title-container">
        <button 
          className={`pin-toggle-btn ${pinnedSections.includes(sectionId) ? 'pinned' : ''}`}
          onClick={() => onTogglePin(sectionId)}
          title={pinnedSections.includes(sectionId) ? 'Unpin from top' : 'Pin to top'}
        >
          <PinIcon filled={pinnedSections.includes(sectionId)} />
        </button>
        <h2 className="section-title">GENERAL CONTACT INQUIRIES</h2>
      </div>
      <div className="admin-stats">
        <div className="stat-item">
          <span className="stat-label">TOTAL CONTACTS</span>
          <span className="stat-value">{contactInquiries.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">PENDING</span>
          <span className="stat-value">{contactInquiries.filter(r => r.status === 'pending').length}</span>
        </div>
        <div className="stat-item toggle-archived">
          <button 
            className={`admin-btn small ${showArchived ? 'active' : ''}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({contactInquiries.filter(r => r.status === 'archived').length})
          </button>
        </div>
      </div>

      <div className="requests-table-container admin-table-shell">
        {loading ? (
          <p className="loading-text">RETRIEVING DATA...</p>
        ) : filteredInquiries.length === 0 ? (
          <p className="loading-text">NO CONTACT INQUIRIES FOUND.</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>NAME / ENTITY</th>
                <th>EMAIL</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((req) => {
                const isExpanded = Boolean(expandedInquiries[req.id]);
                
                // Parse subject and message from notes if they follow our format
                let subject = 'General Inquiry';
                let message = req.notes;
                
                if (req.notes?.startsWith('SUBJECT:')) {
                  const parts = req.notes.split('\n\n');
                  subject = parts[0].replace('SUBJECT: ', '');
                  message = parts.slice(1).join('\n\n');
                }

                return (
                  <Fragment key={req.id}>
                    <tr className={`${isExpanded ? 'inquiry-row-expanded' : ''} status-${req.status}`}>
                      <td className="ticket-detail-toggle-cell">
                        <button
                          type="button"
                          className={`ticket-detail-toggle ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => toggleExpansion(req.id)}
                          aria-expanded={isExpanded}
                          title={isExpanded ? 'Hide details' : 'Show details'}
                          style={{ '--004ffa': '#90e937' }} 
                        >
                          <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#90e937' }}>▶</span>
                        </button>
                      </td>
                      <td>
                        <strong>{req.name}</strong>
                        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{subject}</div>
                      </td>
                      <td>
                        <a href={`mailto:${req.email}`} className="event-name-link">
                          {req.email}
                        </a>
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
                                onClick={() => updateStatus(req.id, 'responded')}
                              >
                                MARK RESPONDED
                              </button>
                            )}
                            {req.status === 'responded' && (
                              <button
                                className="admin-btn reset"
                                onClick={() => updateStatus(req.id, 'pending')}
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
                                onClick={() => updateStatus(req.id, 'archived')}
                              >
                                <ArchiveIcon />
                              </button>
                            ) : (
                              <button
                                className="icon-btn unarchive-btn"
                                title="Unarchive"
                                onClick={() => updateStatus(req.id, 'pending')}
                              >
                                <UnarchiveIcon />
                              </button>
                            )}
                            <button
                              className="icon-btn delete-btn"
                              title="Delete"
                              onClick={() => deleteInquiry(req.id)}
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
                        <td colSpan="4">
                          <div className="inquiry-metadata-panel" style={{ padding: '15px 0', borderLeft: '2px solid #90e937' }}>
                            <div className="inquiry-metadata-grid" style={{ paddingLeft: '15px' }}>
                              <div className="inquiry-metadata-item" style={{ marginBottom: '15px' }}>
                                <span className="inquiry-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SUBMITTED ON</span>
                                <span className="inquiry-metadata-value" style={{ fontWeight: 600 }}>{new Date(req.created_at).toLocaleString()}</span>
                              </div>
                              <div className="inquiry-metadata-item">
                                <span className="inquiry-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MESSAGE</span>
                                <div className="inquiry-metadata-value" style={{ 
                                  whiteSpace: 'pre-wrap', 
                                  fontSize: '13px', 
                                  lineHeight: '1.6', 
                                  color: '#333',
                                  background: '#f9f9f9',
                                  padding: '12px',
                                  border: '1px solid #eee'
                                }}>
                                  {message || 'No message provided.'}
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
  ) : null;
}
