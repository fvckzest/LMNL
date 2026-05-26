import { Fragment, useState } from 'react';
import AdminSectionHeader from './AdminSectionHeader';
import { DeleteActionButton } from './ActionButtons';
import { apiPost } from '../../lib/api';
import { PRIMARY_SERVICES } from '../../lib/serviceCatalog';

function createEmptyMediaItem(index = 0) {
  return {
    id: '',
    media_type: 'image',
    asset_role: 'gallery',
    url: '',
    alt_text: '',
    caption: '',
    sort_order: index,
    is_cover: index === 0,
  };
}

function createEmptyForm() {
  return {
    title: '',
    slug: '',
    year: '',
    client_name: '',
    project_type: '',
    website_url: '',
    summary: '',
    result: '',
    capabilities: '',
    outputs: '',
    focus_areas: [],
    featured: false,
    sort_order: 0,
    status: 'draft',
    media: [createEmptyMediaItem(0)],
  };
}

function formatListForTextarea(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function parseTextareaList(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CAPABILITY_ALIAS_MAP = new Map(
  PRIMARY_SERVICES.flatMap((service) => ([
    [slugify(service.id), service.id],
    [slugify(service.title), service.id],
  ])),
);

function normalizeCapabilityValues(value) {
  return parseTextareaList(value)
    .map((item) => CAPABILITY_ALIAS_MAP.get(slugify(item)) || slugify(item))
    .filter(Boolean);
}

function getPlacementGroups(capabilityText) {
  const selectedCapabilities = new Set(normalizeCapabilityValues(capabilityText));

  const services = selectedCapabilities.size > 0
    ? PRIMARY_SERVICES.filter((service) => selectedCapabilities.has(service.id))
    : PRIMARY_SERVICES;

  return services.map((service) => ({
    id: service.id,
    title: service.title,
    options: service.details.map((detail) => detail.label),
  }));
}

function normalizeMediaForm(media) {
  return (Array.isArray(media) ? media : [])
    .map((item, index) => ({
      id: item?.id || '',
      media_type: item?.media_type || 'image',
      asset_role: item?.asset_role || 'gallery',
      url: item?.url || '',
      alt_text: item?.alt_text || '',
      caption: item?.caption || '',
      sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
      is_cover: item?.is_cover === true,
    }));
}

function findPreviewMedia(media) {
  return (Array.isArray(media) ? media : []).find((item) => item?.asset_role === 'website_preview') || null;
}

function createFormFromEntry(entry) {
  return {
    title: entry.title || '',
    slug: entry.slug || '',
    year: entry.year || '',
    client_name: entry.client_name || '',
    project_type: entry.project_type || '',
    website_url: entry.website_url || '',
    summary: entry.summary || '',
    result: entry.result || '',
    capabilities: formatListForTextarea(entry.capabilities),
    outputs: formatListForTextarea(entry.outputs),
    focus_areas: Array.isArray(entry.focus_areas) ? entry.focus_areas : [],
    featured: entry.featured === true,
    sort_order: Number.isFinite(Number(entry.sort_order)) ? Number(entry.sort_order) : 0,
    status: entry.status || 'draft',
    media: normalizeMediaForm(entry.portfolio_media).length > 0
      ? normalizeMediaForm(entry.portfolio_media)
      : [createEmptyMediaItem(0)],
  };
}

export default function PortfolioTab({
  portfolioEntries,
  portfolioLoading,
  portfolioTableMissing,
  fetchPortfolioEntries,
  showToast,
  triggerConfirm,
  pinnedSections = [],
  collapsedSections = [],
  onTogglePin = () => {},
  onToggleCollapse = () => {},
  renderMode = 'all',
}) {
  const sectionId = 'portfolio_entries';

  const shouldRender = () => {
    if (renderMode === 'all') return true;
    const isPinned = pinnedSections.includes(sectionId);
    if (renderMode === 'pinned') return isPinned;
    if (renderMode === 'unpinned') return !isPinned;
    return true;
  };

  const isCollapsed = collapsedSections.includes(sectionId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewFeedback, setPreviewFeedback] = useState(null);
  const [expandedEntries, setExpandedEntries] = useState({});
  const activeEntryCount = portfolioEntries.filter((entry) => entry.status !== 'archived').length;

  function toggleExpansion(id) {
    setExpandedEntries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function openEditModal(entry = null) {
    if (entry) {
      setEditingEntry(entry);
      setFormData(createFormFromEntry(entry));
    } else {
      setEditingEntry(null);
      setFormData(createEmptyForm());
    }

    setPreviewFeedback(null);
    setIsModalOpen(true);
  }

  function closeEditModal() {
    setIsModalOpen(false);
    setEditingEntry(null);
    setFormData(createEmptyForm());
    setPreviewFeedback(null);
  }

  function updateMediaRow(index, key, value) {
    setFormData((current) => ({
      ...current,
      media: current.media.map((item, itemIndex) => (
        itemIndex === index
          ? { ...item, [key]: value }
          : item
      )),
    }));
  }

  function toggleFocusArea(option) {
    setFormData((current) => {
      const alreadySelected = current.focus_areas.includes(option);

      return {
        ...current,
        focus_areas: alreadySelected
          ? current.focus_areas.filter((item) => item !== option)
          : [...current.focus_areas, option],
      };
    });
  }

  function setCoverMedia(index) {
    setFormData((current) => ({
      ...current,
      media: current.media.map((item, itemIndex) => ({
        ...item,
        is_cover: itemIndex === index,
      })),
    }));
  }

  function addMediaRow() {
    setFormData((current) => ({
      ...current,
      media: [...current.media, createEmptyMediaItem(current.media.length)],
    }));
  }

  function removeMediaRow(index) {
    setFormData((current) => {
      const nextMedia = current.media.filter((_, itemIndex) => itemIndex !== index);
      const normalizedMedia = nextMedia.length > 0 ? nextMedia : [createEmptyMediaItem(0)];

      if (!normalizedMedia.some((item) => item.is_cover)) {
        normalizedMedia[0] = {
          ...normalizedMedia[0],
          is_cover: true,
        };
      }

      return {
        ...current,
        media: normalizedMedia.map((item, itemIndex) => ({
          ...item,
          sort_order: itemIndex,
        })),
      };
    });
  }

  function applySavedEntry(savedEntry) {
    setEditingEntry(savedEntry);
    setFormData(createFormFromEntry(savedEntry));
  }

  async function persistEntry({ closeAfterSave = false } = {}) {
    const payload = {
      action: editingEntry ? 'update' : 'create',
      ...(editingEntry ? { id: editingEntry.id } : {}),
      title: formData.title,
      slug: formData.slug,
      year: formData.year,
      client_name: formData.client_name,
      project_type: formData.project_type,
      website_url: formData.website_url,
      summary: formData.summary,
      result: formData.result,
      capabilities: parseTextareaList(formData.capabilities),
      outputs: parseTextareaList(formData.outputs),
      focus_areas: formData.focus_areas,
      featured: formData.featured,
      sort_order: Number(formData.sort_order) || 0,
      status: formData.status,
      media: formData.media
        .map((item, index) => ({
          id: item.id || undefined,
          media_type: item.media_type,
          asset_role: item.asset_role || 'gallery',
          url: item.url,
          alt_text: item.alt_text,
          caption: item.caption,
          sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
          is_cover: item.is_cover === true,
        }))
        .filter((item) => item.url),
    };

    const savedEntry = await apiPost('/api/portfolio', payload, { auth: true });
    applySavedEntry(savedEntry);
    await fetchPortfolioEntries();

    if (closeAfterSave) {
      closeEditModal();
    }

    return savedEntry;
  }

  async function handleSaveEntry(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await persistEntry({ closeAfterSave: true });
      showToast(editingEntry ? 'Portfolio entry updated.' : 'Portfolio entry created.');
    } catch (error) {
      showToast('Error saving entry: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGeneratePreview() {
    if (!formData.website_url.trim()) {
      setPreviewFeedback({
        type: 'error',
        message: 'Add a website URL before generating a preview.',
      });
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewFeedback({
      type: 'pending',
      message: 'Generating a desktop screenshot and saving it to storage...',
    });

    try {
      const savedEntry = await persistEntry();
      const previewEntry = await apiPost('/api/portfolio', {
        action: 'generate-preview',
        id: savedEntry.id,
        website_url: savedEntry.website_url || formData.website_url,
        title: savedEntry.title,
      }, { auth: true });

      applySavedEntry(previewEntry);
      await fetchPortfolioEntries();
      setPreviewFeedback({
        type: 'success',
        message: 'Website preview generated and set as the cover image.',
      });
      showToast('Website preview generated.');
    } catch (error) {
      setPreviewFeedback({
        type: 'error',
        message: error.message,
      });
      showToast('Preview generation failed: ' + error.message, 'error');
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  async function handleDeleteEntry(id) {
    triggerConfirm('Delete this portfolio entry permanently?', async () => {
      try {
        await apiPost('/api/portfolio', { action: 'delete', id }, { auth: true });
        await fetchPortfolioEntries();
        showToast('Portfolio entry removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  const placementGroups = getPlacementGroups(formData.capabilities);
  const previewMedia = findPreviewMedia(formData.media);
  const hasStoredPreview = Boolean(previewMedia?.url);

  return shouldRender() ? (
    <section className="admin-section" style={{ '--active-tab-color': '#6222d8' }}>
      <AdminSectionHeader
        title="PORTFOLIO"
        isPinned={pinnedSections.includes(sectionId)}
        onTogglePin={() => onTogglePin(sectionId)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => onToggleCollapse(sectionId)}
        collapsedCount={activeEntryCount}
      />

      {!isCollapsed && (
        <>
          <div className="admin-stats">
            <div className="stat-item">
              <span className="stat-label">TOTAL ENTRIES</span>
              <span className="stat-value">{portfolioEntries.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">PUBLISHED</span>
              <span className="stat-value">{portfolioEntries.filter((entry) => entry.status === 'published').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">FEATURED</span>
              <span className="stat-value">{portfolioEntries.filter((entry) => entry.featured).length}</span>
            </div>
            <div className="stat-item stat-item--action">
              <button className="admin-btn approve" onClick={() => openEditModal()}>
                + ADD ENTRY
              </button>
            </div>
          </div>

          <div className="requests-table-container admin-table-shell">
            {portfolioLoading ? (
              <p className="loading-text">RETRIEVING PORTFOLIO...</p>
            ) : portfolioTableMissing ? (
              <div className="setup-warning">
                <strong>Portfolio tables not set up yet.</strong>
                <p>Run the portfolio SQL migration in Supabase, then refresh this view.</p>
              </div>
            ) : portfolioEntries.length === 0 ? (
              <p className="loading-text">NO PORTFOLIO ENTRIES FOUND.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>TITLE</th>
                    <th>CLIENT</th>
                    <th>TYPE</th>
                    <th>YEAR</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioEntries.map((entry) => {
                    const isExpanded = Boolean(expandedEntries[entry.id]);
                    return (
                      <Fragment key={entry.id}>
                        <tr className={isExpanded ? 'inquiry-row-expanded' : ''}>
                          <td className="ticket-detail-toggle-cell">
                            <button
                              type="button"
                              className={`ticket-detail-toggle ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => toggleExpansion(entry.id)}
                              aria-expanded={isExpanded}
                              title={isExpanded ? 'Hide details' : 'Show details'}
                              style={{ '--004ffa': '#6222d8' }}
                            >
                              <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#6222d8' }}>▶</span>
                            </button>
                          </td>
                          <td>
                            <strong>{entry.title}</strong>
                          </td>
                          <td>{entry.client_name || '—'}</td>
                          <td>{entry.project_type || '—'}</td>
                          <td>{entry.year || '—'}</td>
                          <td>
                            <span className={`status-pill ${entry.status}`}>
                              {String(entry.status || 'draft').toUpperCase()}
                            </span>
                          </td>
                          <td className="actions-cell">
                            <div className="actions-wrapper">
                              <div className="main-actions">
                                <button className="admin-btn" onClick={() => openEditModal(entry)}>
                                  EDIT
                                </button>
                              </div>
                              <div className="secondary-actions">
                                <DeleteActionButton onClick={() => handleDeleteEntry(entry.id)} />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="inquiry-metadata-row">
                            <td></td>
                            <td colSpan="6">
                              <div className="inquiry-metadata-panel" style={{ padding: '15px 0', borderLeft: '2px solid #6222d8' }}>
                                <div className="inquiry-metadata-grid" style={{ paddingLeft: '15px' }}>
                                  <div className="inquiry-metadata-item">
                                    <span className="inquiry-metadata-label">Summary</span>
                                    <div className="inquiry-metadata-value">{entry.summary || 'No summary.'}</div>
                                  </div>
                                  <div className="inquiry-metadata-item">
                                    <span className="inquiry-metadata-label">Website URL</span>
                                    <div className="inquiry-metadata-value">{entry.website_url || '—'}</div>
                                  </div>
                                  <div className="inquiry-metadata-item">
                                    <span className="inquiry-metadata-label">Capabilities</span>
                                    <div className="inquiry-metadata-value">{(entry.capabilities || []).join(' / ') || '—'}</div>
                                  </div>
                                  <div className="inquiry-metadata-item">
                                    <span className="inquiry-metadata-label">Outputs</span>
                                    <div className="inquiry-metadata-value">{(entry.outputs || []).join(' / ') || '—'}</div>
                                  </div>
                                  <div className="inquiry-metadata-item">
                                    <span className="inquiry-metadata-label">Focus Areas</span>
                                    <div className="inquiry-metadata-value">{(entry.focus_areas || []).join(' / ') || '—'}</div>
                                  </div>
                                  <div className="inquiry-metadata-item inquiry-metadata-item--wide">
                                    <span className="inquiry-metadata-label">Media URLs</span>
                                    <div className="inquiry-metadata-value">
                                      {(entry.portfolio_media || []).length > 0 ? (
                                        (entry.portfolio_media || []).map((item) => item.url).join('\n')
                                      ) : 'No media attached.'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {isModalOpen ? (
            <div className="admin-modal-overlay">
              <div className="admin-modal">
                <div className="modal-header">
                  <h3>{editingEntry ? 'EDIT PORTFOLIO ENTRY' : 'ADD PORTFOLIO ENTRY'}</h3>
                  <button type="button" className="admin-btn" onClick={closeEditModal}>CLOSE</button>
                </div>

                <form className="modal-form theme-form" onSubmit={handleSaveEntry}>
                  <div className="form-grid">
                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-title">Title</label>
                      <input
                        id="portfolio-title"
                        className="admin-input theme-input"
                        value={formData.title}
                        onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-slug">Slug</label>
                      <input
                        id="portfolio-slug"
                        className="admin-input theme-input"
                        value={formData.slug}
                        onChange={(event) => setFormData((current) => ({ ...current, slug: event.target.value }))}
                        placeholder="auto-generated if left blank"
                      />
                    </div>

                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-year">Year</label>
                      <input
                        id="portfolio-year"
                        className="admin-input theme-input"
                        type="number"
                        value={formData.year}
                        onChange={(event) => setFormData((current) => ({ ...current, year: event.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-client">Who It Was For</label>
                      <input
                        id="portfolio-client"
                        className="admin-input theme-input"
                        value={formData.client_name}
                        onChange={(event) => setFormData((current) => ({ ...current, client_name: event.target.value }))}
                      />
                    </div>

                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-type">Project Type</label>
                      <input
                        id="portfolio-type"
                        className="admin-input theme-input"
                        value={formData.project_type}
                        onChange={(event) => setFormData((current) => ({ ...current, project_type: event.target.value }))}
                        placeholder="Website / Poster / Identity"
                        required
                      />
                    </div>

                    <div className="form-group theme-field full">
                      <label htmlFor="portfolio-website-url">Website URL</label>
                      <input
                        id="portfolio-website-url"
                        className="admin-input theme-input"
                        type="url"
                        value={formData.website_url}
                        onChange={(event) => setFormData((current) => ({ ...current, website_url: event.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-status">Status</label>
                      <select
                        id="portfolio-status"
                        className="admin-input theme-input"
                        value={formData.status}
                        onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                      >
                        <option value="draft">DRAFT</option>
                        <option value="published">PUBLISHED</option>
                        <option value="archived">ARCHIVED</option>
                      </select>
                    </div>

                    <div className="form-group theme-field full">
                      <label htmlFor="portfolio-summary">Summary</label>
                      <textarea
                        id="portfolio-summary"
                        className="admin-input theme-input"
                        rows="4"
                        value={formData.summary}
                        onChange={(event) => setFormData((current) => ({ ...current, summary: event.target.value }))}
                      />
                    </div>

                    <div className="form-group theme-field full">
                      <label htmlFor="portfolio-result">Result / Highlight</label>
                      <textarea
                        id="portfolio-result"
                        className="admin-input theme-input"
                        rows="3"
                        value={formData.result}
                        onChange={(event) => setFormData((current) => ({ ...current, result: event.target.value }))}
                      />
                    </div>

                    <div className="form-group theme-field full">
                      <label htmlFor="portfolio-capabilities">Capabilities Employed</label>
                      <textarea
                        id="portfolio-capabilities"
                        className="admin-input theme-input"
                        rows="4"
                        value={formData.capabilities}
                        onChange={(event) => setFormData((current) => ({ ...current, capabilities: event.target.value }))}
                        placeholder="One per line or comma-separated"
                      />
                    </div>

                    <div className="form-group theme-field full">
                      <label htmlFor="portfolio-outputs">What We Made</label>
                      <textarea
                        id="portfolio-outputs"
                        className="admin-input theme-input"
                        rows="4"
                        value={formData.outputs}
                        onChange={(event) => setFormData((current) => ({ ...current, outputs: event.target.value }))}
                        placeholder="One per line or comma-separated"
                      />
                    </div>

                    <div className="form-group theme-field full">
                      <label>Portfolio Placement</label>
                      <div className="portfolio-admin-placement-shell">
                        <p className="portfolio-admin-placement-help">
                          Choose where this entry should appear on the portfolio page.
                        </p>
                        <div className="portfolio-admin-placement-list">
                          {placementGroups.map((group) => (
                            <div key={group.id} className="portfolio-admin-placement-group">
                              <p className="portfolio-admin-placement-title">{group.title}</p>
                              <div className="portfolio-admin-placement-options">
                                {group.options.map((option) => {
                                  const inputId = `portfolio-focus-${slugify(group.id)}-${slugify(option)}`;
                                  const isChecked = formData.focus_areas.includes(option);

                                  return (
                                    <label key={option} htmlFor={inputId} className={`portfolio-admin-placement-option ${isChecked ? 'is-selected' : ''}`}>
                                      <input
                                        id={inputId}
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleFocusArea(option)}
                                      />
                                      <span>{option}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="form-group theme-field">
                      <label htmlFor="portfolio-order">Sort Order</label>
                      <input
                        id="portfolio-order"
                        className="admin-input theme-input"
                        type="number"
                        value={formData.sort_order}
                        onChange={(event) => setFormData((current) => ({ ...current, sort_order: event.target.value }))}
                      />
                    </div>

                    <div className="form-group checkbox">
                      <input
                        id="portfolio-featured"
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(event) => setFormData((current) => ({ ...current, featured: event.target.checked }))}
                      />
                      <label htmlFor="portfolio-featured">Featured entry</label>
                    </div>

                    <div className="form-group full">
                      <label>Website Preview</label>
                      <div className="portfolio-admin-placement-shell">
                        <p className="portfolio-admin-placement-help">
                          Generate one saved desktop screenshot for website projects. The stored image becomes the portfolio cover.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={handleGeneratePreview}
                            disabled={isSubmitting || isGeneratingPreview}
                          >
                            {isGeneratingPreview
                              ? 'GENERATING PREVIEW...'
                              : hasStoredPreview
                                ? 'REGENERATE PREVIEW'
                                : 'GENERATE PREVIEW'}
                          </button>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {hasStoredPreview ? 'Saved preview ready.' : 'No saved preview yet.'}
                          </span>
                        </div>
                        {previewFeedback ? (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '10px 12px',
                              border: `1px solid ${previewFeedback.type === 'error' ? '#ff6b6b' : '#d9d9d9'}`,
                              background: previewFeedback.type === 'error' ? '#fff5f5' : '#fafafa',
                              fontSize: '12px',
                              color: '#333',
                            }}
                          >
                            {previewFeedback.message}
                          </div>
                        ) : null}
                        {hasStoredPreview ? (
                          <div style={{ marginTop: '12px' }}>
                            <img
                              src={previewMedia.url}
                              alt={previewMedia.alt_text || `${formData.title || 'Portfolio entry'} preview`}
                              style={{
                                display: 'block',
                                width: '100%',
                                maxWidth: '360px',
                                border: '1px solid #e5e5e5',
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="form-group full">
                      <label>Media Files / Visual Documentation</label>
                      <div className="portfolio-admin-media-list">
                        {formData.media.map((item, index) => (
                          <div key={`${item.id || 'new'}-${index}`} className="portfolio-admin-media-item">
                            <div className="portfolio-admin-media-grid">
                              <div className="form-group theme-field">
                                <label htmlFor={`portfolio-media-type-${index}`}>Media Type</label>
                                <select
                                  id={`portfolio-media-type-${index}`}
                                  className="admin-input theme-input"
                                  value={item.media_type}
                                  onChange={(event) => updateMediaRow(index, 'media_type', event.target.value)}
                                  disabled={item.asset_role === 'website_preview'}
                                >
                                  <option value="image">IMAGE</option>
                                  <option value="video">VIDEO</option>
                                  <option value="pdf">PDF</option>
                                  <option value="embed">EMBED</option>
                                </select>
                              </div>

                              <div className="form-group theme-field">
                                <label htmlFor={`portfolio-media-order-${index}`}>Media Order</label>
                                <input
                                  id={`portfolio-media-order-${index}`}
                                  className="admin-input theme-input"
                                  type="number"
                                  value={item.sort_order}
                                  onChange={(event) => updateMediaRow(index, 'sort_order', event.target.value)}
                                  disabled={item.asset_role === 'website_preview'}
                                />
                              </div>

                              <div className="form-group theme-field full">
                                <label htmlFor={`portfolio-media-url-${index}`}>URL or File Path</label>
                                <input
                                  id={`portfolio-media-url-${index}`}
                                  className="admin-input theme-input"
                                  value={item.url}
                                  onChange={(event) => updateMediaRow(index, 'url', event.target.value)}
                                  placeholder="/portfolio/project-name/image.jpg or https://..."
                                  disabled={item.asset_role === 'website_preview'}
                                />
                              </div>

                              <div className="form-group theme-field">
                                <label htmlFor={`portfolio-media-alt-${index}`}>Alt Text</label>
                                <input
                                  id={`portfolio-media-alt-${index}`}
                                  className="admin-input theme-input"
                                  value={item.alt_text}
                                  onChange={(event) => updateMediaRow(index, 'alt_text', event.target.value)}
                                  disabled={item.asset_role === 'website_preview'}
                                />
                              </div>

                              <div className="form-group theme-field">
                                <label htmlFor={`portfolio-media-caption-${index}`}>Caption</label>
                                <input
                                  id={`portfolio-media-caption-${index}`}
                                  className="admin-input theme-input"
                                  value={item.caption}
                                  onChange={(event) => updateMediaRow(index, 'caption', event.target.value)}
                                  disabled={item.asset_role === 'website_preview'}
                                />
                              </div>
                            </div>

                            <div className="portfolio-admin-media-actions">
                              <label className="portfolio-admin-media-cover">
                                <input
                                  type="radio"
                                  name="portfolio-cover-media"
                                  checked={item.is_cover === true}
                                  onChange={() => setCoverMedia(index)}
                                  disabled={item.asset_role === 'website_preview'}
                                />
                                <span>Use as cover image</span>
                              </label>

                              {item.asset_role === 'website_preview' ? (
                                <span style={{ fontSize: '11px', color: '#666' }}>Generated preview</span>
                              ) : null}

                              <button
                                type="button"
                                className="admin-btn"
                                onClick={() => removeMediaRow(index)}
                                disabled={item.asset_role === 'website_preview'}
                              >
                                REMOVE
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button type="button" className="admin-btn" onClick={addMediaRow}>
                        ADD MEDIA
                      </button>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="admin-btn approve wide" disabled={isSubmitting}>
                      {isSubmitting ? 'SAVING...' : 'SAVE ENTRY'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  ) : null;
}
