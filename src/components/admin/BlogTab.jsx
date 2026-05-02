import { useState, Fragment } from 'react';
import { TrashIcon, PinIcon } from './Icons';
import { apiPost } from '../../lib/api';

export default function BlogTab({
  blogPosts,
  blogLoading,
  blogTableMissing,
  fetchBlogPosts,
  showToast,
  triggerConfirm,
  pinnedSections = [],
  onTogglePin = () => { },
  renderMode = 'all'
}) {
  const sectionId = 'blog_posts';

  const shouldRender = () => {
    if (renderMode === 'all') return true;
    const isPinned = pinnedSections.includes(sectionId);
    if (renderMode === 'pinned') return isPinned;
    if (renderMode === 'unpinned') return !isPinned;
    return true;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    author: '',
    date: '',
    status: 'draft'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});

  function toggleExpansion(id) {
    setExpandedPosts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  function openEditModal(post = null) {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        author: post.author || '',
        date: post.date || '',
        status: post.status || 'draft'
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        content: '',
        author: '',
        date: '',
        status: 'draft'
      });
    }
    setIsModalOpen(true);
  }

  function closeEditModal() {
    setIsModalOpen(false);
    setEditingPost(null);
  }

  async function handleSavePost(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPost) {
        await apiPost('/api/blog-posts', {
          action: 'update',
          id: editingPost.id,
          ...formData
        });
        showToast('Blog post updated.');
      } else {
        await apiPost('/api/blog-posts', {
          action: 'create',
          ...formData
        });
        showToast('Blog post created.');
      }
      fetchBlogPosts();
      closeEditModal();
    } catch (error) {
      showToast('Error saving post: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePost(id) {
    triggerConfirm('Delete this blog post permanently?', async () => {
      try {
        await apiPost('/api/blog-posts', { action: 'delete', id });
        fetchBlogPosts();
        showToast('Blog post removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  return shouldRender() ? (
    <section className="admin-section" style={{ '--active-tab-color': '#ffde00' }}>
      <div className="section-title-container">
        <button
          className={`pin-toggle-btn ${pinnedSections.includes(sectionId) ? 'pinned' : ''}`}
          onClick={() => onTogglePin(sectionId)}
          title={pinnedSections.includes(sectionId) ? 'Unpin from top' : 'Pin to top'}
        >
          <PinIcon filled={pinnedSections.includes(sectionId)} />
        </button>
        <h2 className="section-title">BLOG POSTS</h2>
      </div>

      <div className="admin-stats">
        <div className="stat-item">
          <span className="stat-label">TOTAL POSTS</span>
          <span className="stat-value">{blogPosts.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">PUBLISHED</span>
          <span className="stat-value">{blogPosts.filter(p => p.status === 'published').length}</span>
        </div>
        <div className="stat-item" style={{ marginLeft: 'auto', borderRight: 'none', paddingRight: 0 }}>
          <button className="admin-btn approve" onClick={() => openEditModal()}>+ ADD POST</button>
        </div>
      </div>

      <div className="requests-table-container admin-table-shell">
        {blogLoading ? (
          <p className="loading-text">RETRIEVING POSTS...</p>
        ) : blogTableMissing ? (
          <div className="setup-warning">
            <h3 style={{ color: '#991b1b', marginBottom: '10px' }}>⚠️ SETUP REQUIRED: MISSING TABLE</h3>
            <p>The `blog_posts` table does not exist in your Supabase database.</p>
            <p style={{ marginTop: '10px' }}>Please create the table in your Supabase SQL Editor with the following columns:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', fontSize: '12px', lineHeight: '1.5' }}>
              <li><strong>id</strong>: uuid, primary key, default `gen_random_uuid()`</li>
              <li><strong>title</strong>: text</li>
              <li><strong>slug</strong>: text, unique</li>
              <li><strong>content</strong>: text</li>
              <li><strong>author</strong>: text</li>
              <li><strong>date</strong>: date</li>
              <li><strong>status</strong>: text, default `'draft'`</li>
              <li><strong>created_at</strong>: timestamp, default `now()`</li>
            </ul>
          </div>
        ) : blogPosts.length === 0 ? (
          <p className="loading-text">NO BLOG POSTS FOUND.</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>TITLE</th>
                <th>SLUG</th>
                <th>AUTHOR</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {blogPosts.map((post) => {
                const isExpanded = Boolean(expandedPosts[post.id]);
                return (
                  <Fragment key={post.id}>
                    <tr className={`${isExpanded ? 'inquiry-row-expanded' : ''} status-${post.status}`}>
                      <td className="ticket-detail-toggle-cell">
                        <button
                          type="button"
                          className={`ticket-detail-toggle ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => toggleExpansion(post.id)}
                          aria-expanded={isExpanded}
                          title={isExpanded ? 'Hide details' : 'Show details'}
                          style={{ '--004ffa': '#ffde00' }}
                        >
                          <span className="admin-toggle-arrow ticket-toggle-arrow" style={{ color: '#ffde00' }}>▶</span>
                        </button>
                      </td>
                      <td>
                        <strong>{post.title}</strong>
                        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{post.date ? new Date(post.date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : new Date(post.created_at).toLocaleString()}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                        /{post.slug || '—'}
                      </td>
                      <td>{post.author || '—'}</td>
                      <td>
                        <span className={`status-pill ${post.status}`}>
                          {post.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <div className="actions-wrapper">
                          <div className="main-actions">
                            <button
                              className="admin-btn"
                              onClick={() => openEditModal(post)}
                            >
                              EDIT
                            </button>
                          </div>
                          <div className="secondary-actions">
                            <button
                              className="icon-btn delete-btn"
                              title="Delete"
                              onClick={() => handleDeletePost(post.id)}
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
                        <td colSpan="6">
                          <div className="inquiry-metadata-panel" style={{ padding: '15px 0', borderLeft: '2px solid #ffde00' }}>
                            <div className="inquiry-metadata-grid" style={{ paddingLeft: '15px' }}>
                              <div className="inquiry-metadata-item">
                                <span className="inquiry-metadata-label" style={{ display: 'block', fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CONTENT PREVIEW</span>
                                <div className="inquiry-metadata-value" style={{
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '13px',
                                  lineHeight: '1.6',
                                  color: '#333',
                                  background: '#f9f9f9',
                                  padding: '12px',
                                  border: '1px solid #eee',
                                  maxHeight: '200px',
                                  overflowY: 'auto'
                                }}>
                                  {post.content || 'No content.'}
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

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{editingPost ? 'EDIT BLOG POST' : 'NEW BLOG POST'}</h3>
              <button className="close-modal" onClick={closeEditModal}>×</button>
            </div>
            <div className="admin-modal-body" style={{ padding: '0 40px 40px 40px' }}>
              <form onSubmit={handleSavePost} className="modal-form">
                <div className="form-grid">
                  <div className="form-group full">
                    <label>TITLE</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>SLUG (URL)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g. my-first-post"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>AUTHOR</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="LMNL"
                    />
                  </div>
                  <div className="form-group">
                    <label>DATE</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>STATUS</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="draft">DRAFT</option>
                      <option value="published">PUBLISHED</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>CONTENT</label>
                    <textarea
                      rows="10"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      style={{ resize: 'vertical' }}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-actions" style={{ marginTop: '20px' }}>
                  <button type="submit" className="admin-btn approve wide" disabled={isSubmitting}>
                    {isSubmitting ? 'SAVING...' : 'SAVE POST'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  ) : null;
}
