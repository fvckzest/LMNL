import { useState, Fragment } from 'react';
import AdminSectionHeader from './AdminSectionHeader';
import { ArchiveToggleButton, DeleteActionButton } from './ActionButtons';
import PortfolioTab from './PortfolioTab';

export default function InquiriesTab({
   serviceInquiries,
   servicesLoading,
   websiteIntakeSubmissions = [],
   websiteIntakeLoading = false,
   websiteIntakeTableMissing = false,
   updateWebsiteIntakeStatus = () => {},
   deleteWebsiteIntakeSubmission = () => {},
   updateServiceStatus,
   deleteServiceInquiry,
   portfolioEntries = [],
   portfolioLoading = false,
   portfolioTableMissing = false,
   fetchPortfolioEntries = () => {},
   showToast = () => {},
   triggerConfirm = () => {},
   pinnedSections = [],
   collapsedSections = [],
   onTogglePin = () => {},
   onToggleCollapse = () => {},
   renderMode = 'all'
 }) {
   const sectionId = 'service_inquiries';
   const intakeSectionId = 'website_intake_submissions';

   const shouldRenderSection = (targetSectionId) => {
     if (renderMode === 'all') return true;
     const isPinned = pinnedSections.includes(targetSectionId);
     if (renderMode === 'pinned') return isPinned;
     if (renderMode === 'unpinned') return !isPinned;
     return true;
   };
   const isCollapsed = (targetId) => collapsedSections.includes(targetId);

   const [showArchivedServices, setShowArchivedServices] = useState(false);
   const [expandedInquiries, setExpandedInquiries] = useState({});
   const [expandedIntakeSubmissions, setExpandedIntakeSubmissions] = useState({});
   const activeInquiryCount = serviceInquiries.filter((req) => req.status !== 'archived').length;
   const activeIntakeCount = websiteIntakeSubmissions.filter((submission) => submission.status !== 'archived').length;

   function toggleInquiryExpansion(id) {
     setExpandedInquiries(prev => ({
       ...prev,
       [id]: !prev[id]
     }));
   }

   function toggleIntakeExpansion(id) {
     setExpandedIntakeSubmissions(prev => ({
       ...prev,
       [id]: !prev[id]
     }));
   }

   function formatList(value) {
     return Array.isArray(value) && value.length > 0 ? value.join(' / ') : '—';
   }

   function renderDetail(label, value, { wide = false, preserveLines = false } = {}) {
     return (
       <div className={`inquiry-metadata-item ${wide ? 'inquiry-metadata-item--wide' : ''}`}>
         <span className="inquiry-metadata-label">{label}</span>
         <div className={preserveLines ? 'inquiry-metadata-message' : 'inquiry-metadata-value'}>
           {value || '—'}
         </div>
       </div>
     );
   }

   function formatBriefValue(value) {
     if (Array.isArray(value)) {
       return value.length > 0 ? value.join(', ') : 'Not provided';
     }

     return String(value || '').trim() || 'Not provided';
   }

   function buildWebsiteIntakeBrief(submission) {
     return `# Website Intake Brief

## Business
Business name: ${formatBriefValue(submission.business_name)}
Contact name: ${formatBriefValue(submission.contact_name)}
Email: ${formatBriefValue(submission.email)}
Phone: ${formatBriefValue(submission.phone)}
Location: ${formatBriefValue(submission.business_location)}
Current website: ${formatBriefValue(submission.current_website)}
Social links: ${formatBriefValue(submission.social_links)}

## Project Goal
Website goal: ${formatBriefValue(submission.website_goal)}
Primary action: ${formatBriefValue(submission.primary_action)}
Target audience: ${formatBriefValue(submission.target_audience)}
Desired feeling: ${formatBriefValue(submission.desired_feeling)}

## Pages + Content
Requested pages: ${formatBriefValue(submission.requested_pages)}
Existing assets: ${formatBriefValue(submission.existing_assets)}

## Style Direction
Style references: ${formatBriefValue(submission.style_references)}

## Features + Logistics
Needed features: ${formatBriefValue(submission.needed_features)}
Timeline: ${formatBriefValue(submission.timeline)}
Budget range: ${formatBriefValue(submission.budget_range)}
Decision makers: ${formatBriefValue(submission.decision_makers)}

## Additional Notes
${formatBriefValue(submission.additional_notes)}

## LLM Task
Use this intake to create a first-pass website direction including sitemap, homepage structure, visual direction, copy tone, component list, and implementation prompt.`;
   }

   async function copyWebsiteIntakeBrief(submission) {
     try {
       await navigator.clipboard.writeText(buildWebsiteIntakeBrief(submission));
       showToast('Website intake brief copied.');
     } catch (error) {
       console.error('Failed to copy website intake brief:', error);
       showToast('Copy failed. Clipboard permission may be blocked.', 'error');
     }
   }

   return (
    <>
      {shouldRenderSection(sectionId) ? (
        <section className="admin-section" style={{ '--active-tab-color': '#6222d8' }}>
        <AdminSectionHeader
          title="SERVICE INQUIRIES"
          isPinned={pinnedSections.includes(sectionId)}
          onTogglePin={() => onTogglePin(sectionId)}
          isCollapsed={isCollapsed(sectionId)}
          onToggleCollapse={() => onToggleCollapse(sectionId)}
          collapsedCount={activeInquiryCount}
        />
        {!isCollapsed(sectionId) && (
          <>
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
                              <ArchiveToggleButton
                                isArchived={req.status === 'archived'}
                                archiveTitle="Archive"
                                unarchiveTitle="Unarchive"
                                onArchive={() => updateServiceStatus(req.id, 'archived')}
                                onUnarchive={() => updateServiceStatus(req.id, 'pending')}
                              />
                              <DeleteActionButton
                                title="Delete Inquiry"
                                onClick={() => deleteServiceInquiry(req.id)}
                              />
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
          </>
        )}
      </section>
      ) : null}

      {shouldRenderSection(intakeSectionId) ? (
        <section className="admin-section" style={{ '--active-tab-color': '#6222d8' }}>
          <AdminSectionHeader
            title="WEBSITE INTAKE"
            isPinned={pinnedSections.includes(intakeSectionId)}
            onTogglePin={() => onTogglePin(intakeSectionId)}
            isCollapsed={isCollapsed(intakeSectionId)}
            onToggleCollapse={() => onToggleCollapse(intakeSectionId)}
            collapsedCount={activeIntakeCount}
          />
          {!isCollapsed(intakeSectionId) && (
            <>
              <div className="admin-stats">
                <div className="stat-item">
                  <span className="stat-label">TOTAL INTAKES</span>
                  <span className="stat-value">{websiteIntakeSubmissions.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">NEW</span>
                  <span className="stat-value">{websiteIntakeSubmissions.filter(r => r.status === 'new').length}</span>
                </div>
              </div>

              <div className="requests-table-container admin-table-shell">
                {websiteIntakeLoading ? (
                  <p className="loading-text">RETRIEVING DATA...</p>
                ) : websiteIntakeTableMissing ? (
                  <p className="loading-text">WEBSITE INTAKE TABLE IS NOT SET UP YET.</p>
                ) : websiteIntakeSubmissions.length === 0 ? (
                  <p className="loading-text">NO WEBSITE INTAKES FOUND.</p>
                ) : (
                  <table className="requests-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>BUSINESS</th>
                        <th>CONTACT</th>
                        <th>EMAIL</th>
                        <th>PRIMARY ACTION</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {websiteIntakeSubmissions.map((submission) => {
                        const isExpanded = Boolean(expandedIntakeSubmissions[submission.id]);

                        return (
                          <Fragment key={submission.id}>
                            <tr className={`${isExpanded ? 'inquiry-row-expanded' : ''} status-${submission.status}`}>
                              <td className="ticket-detail-toggle-cell">
                                <button
                                  type="button"
                                  className={`ticket-detail-toggle ${isExpanded ? 'expanded' : ''}`}
                                  onClick={() => toggleIntakeExpansion(submission.id)}
                                  aria-expanded={isExpanded}
                                  title={isExpanded ? 'Hide details' : 'Show details'}
                                >
                                  <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#6222d8' }}>▶</span>
                                </button>
                              </td>
                              <td><strong>{submission.business_name}</strong></td>
                              <td>{submission.contact_name}</td>
                              <td>
                                <a href={`mailto:${submission.email}`} className="event-name-link">
                                  {submission.email}
                                </a>
                              </td>
                              <td>{submission.primary_action || '—'}</td>
                              <td>
                                <span className={`status-pill ${submission.status}`}>
                                  {submission.status || 'new'}
                                </span>
                              </td>
                              <td className="actions-cell">
                                <div className="actions-wrapper">
                                  <div className="main-actions">
                                    <button
                                      type="button"
                                      className="admin-btn intake-copy-brief-btn"
                                      onClick={() => copyWebsiteIntakeBrief(submission)}
                                    >
                                      COPY BRIEF
                                    </button>
                                  </div>
                                  <div className="secondary-actions">
                                    <ArchiveToggleButton
                                      isArchived={submission.status === 'archived'}
                                      archiveTitle="Archive"
                                      unarchiveTitle="Unarchive"
                                      onArchive={() => updateWebsiteIntakeStatus(submission.id, 'archived')}
                                      onUnarchive={() => updateWebsiteIntakeStatus(submission.id, 'new')}
                                    />
                                    <DeleteActionButton
                                      title="Delete Intake"
                                      onClick={() => deleteWebsiteIntakeSubmission(submission.id)}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="inquiry-metadata-row">
                                <td></td>
                                <td colSpan="6">
                                  <div className="inquiry-metadata-panel" style={{ padding: '15px 0', borderLeft: '2px solid #6222d8' }}>
                                    <div className="inquiry-metadata-grid intake-admin-detail-grid" style={{ paddingLeft: '15px' }}>
                                      {renderDetail('Submitted On', new Date(submission.created_at).toLocaleString())}
                                      {renderDetail('Phone', submission.phone)}
                                      {renderDetail('Current Website', submission.current_website)}
                                      {renderDetail('Business Location', submission.business_location)}
                                      {renderDetail('Social Links', submission.social_links, { preserveLines: true })}
                                      {renderDetail('Website Goal', submission.website_goal, { wide: true, preserveLines: true })}
                                      {renderDetail('Target Audience', submission.target_audience, { wide: true, preserveLines: true })}
                                      {renderDetail('Desired Feeling', submission.desired_feeling, { wide: true, preserveLines: true })}
                                      {renderDetail('Requested Pages', formatList(submission.requested_pages))}
                                      {renderDetail('Existing Assets', formatList(submission.existing_assets))}
                                      {renderDetail('Needed Features', formatList(submission.needed_features))}
                                      {renderDetail('Style References', submission.style_references, { wide: true, preserveLines: true })}
                                      {renderDetail('Timeline', submission.timeline)}
                                      {renderDetail('Budget Range', submission.budget_range)}
                                      {renderDetail('Decision Makers', submission.decision_makers, { wide: true, preserveLines: true })}
                                      {renderDetail('Additional Notes', submission.additional_notes, { wide: true, preserveLines: true })}
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
            </>
          )}
        </section>
      ) : null}

      <PortfolioTab
        portfolioEntries={portfolioEntries}
        portfolioLoading={portfolioLoading}
        portfolioTableMissing={portfolioTableMissing}
        fetchPortfolioEntries={fetchPortfolioEntries}
        showToast={showToast}
        triggerConfirm={triggerConfirm}
        pinnedSections={pinnedSections}
        collapsedSections={collapsedSections}
        onTogglePin={onTogglePin}
        onToggleCollapse={onToggleCollapse}
        renderMode={renderMode}
      />
    </>
  );
}
