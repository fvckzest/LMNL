import { useState } from 'react';
import { ArchiveIcon, UnarchiveIcon } from './Icons';

export default function InquiriesTab({
  serviceInquiries,
  servicesLoading,
  updateServiceStatus
}) {
  const [showArchivedServices, setShowArchivedServices] = useState(false);

  return (
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
  );
}
