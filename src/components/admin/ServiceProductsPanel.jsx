import { useState } from 'react';
import { TrashIcon } from './Icons';
import { apiPost } from '../../lib/api';

const EMPTY_FORM = {
  capability: 'BRANDING',
  product: '',
  scope: '',
  sortOrder: 0,
  isActive: true,
};

export default function ServiceProductsPanel({
  serviceProducts,
  serviceProductsLoading,
  serviceProductsTableMissing,
  fetchServiceProducts,
  showToast,
  triggerConfirm,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  function openModal(product = null) {
    setEditingProduct(product);
    setFormData(product ? {
      capability: product.capability || 'BRANDING',
      product: product.product || '',
      scope: product.scope || '',
      sortOrder: Number(product.sort_order || 0),
      isActive: product.is_active !== false,
    } : EMPTY_FORM);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSave(e) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiPost('/api/service-products', {
        id: editingProduct?.id,
        capability: formData.capability,
        product: formData.product,
        scope: formData.scope,
        sortOrder: Number(formData.sortOrder || 0),
        isActive: formData.isActive,
      }, { auth: true });

      await fetchServiceProducts();
      showToast(editingProduct ? 'Service offering updated.' : 'Service offering created.');
      closeModal();
    } catch (error) {
      showToast('Save failed: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    triggerConfirm('Delete this product table offering permanently?', async () => {
      try {
        await apiPost('/api/service-products', { action: 'delete', id }, { auth: true });
        await fetchServiceProducts();
        showToast('Service offering removed.');
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  return (
    <div className="admin-subsection">
      <div className="admin-stats">
        <div className="stat-item">
          <span className="stat-label">PRODUCT ROWS</span>
          <span className="stat-value">{serviceProducts.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">ACTIVE</span>
          <span className="stat-value">{serviceProducts.filter((item) => item.is_active !== false).length}</span>
        </div>
        <div className="stat-item stat-item--action">
          <button className="admin-btn approve" onClick={() => openModal()}>+ ADD OFFERING</button>
        </div>
      </div>

      <div className="requests-table-container admin-table-shell">
        {serviceProductsLoading ? (
          <p className="loading-text">RETRIEVING OFFERINGS...</p>
        ) : serviceProductsTableMissing ? (
          <div className="setup-warning">
            <h3 style={{ color: '#991b1b', marginBottom: '10px' }}>SETUP REQUIRED: MISSING TABLE</h3>
            <p>The `service_products` table does not exist in your Supabase database.</p>
            <p style={{ marginTop: '10px' }}>Create it with these columns:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '10px', fontSize: '12px', lineHeight: '1.5' }}>
              <li><strong>id</strong>: uuid, primary key, default `gen_random_uuid()`</li>
              <li><strong>capability</strong>: text</li>
              <li><strong>product</strong>: text</li>
              <li><strong>scope</strong>: text</li>
              <li><strong>sort_order</strong>: integer, default `0`</li>
              <li><strong>is_active</strong>: boolean, default `true`</li>
              <li><strong>created_at</strong>: timestamp, default `now()`</li>
            </ul>
          </div>
        ) : serviceProducts.length === 0 ? (
          <p className="loading-text">NO PRODUCT TABLE OFFERINGS FOUND.</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>CAPABILITY</th>
                <th>PRODUCT</th>
                <th>SCOPE</th>
                <th>ORDER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {serviceProducts.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.capability}</strong></td>
                  <td>{item.product}</td>
                  <td>{item.scope || '—'}</td>
                  <td>{item.sort_order ?? 0}</td>
                  <td>
                    <span className={`status-pill ${item.is_active !== false ? 'active' : 'archived'}`}>
                      {item.is_active !== false ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="actions-wrapper">
                      <div className="main-actions">
                        <button className="admin-btn" onClick={() => openModal(item)}>
                          EDIT
                        </button>
                      </div>
                      <div className="secondary-actions">
                        <button
                          className="icon-btn delete-btn"
                          title="Delete offering"
                          onClick={() => handleDelete(item.id)}
                          style={{ color: '#991b1b' }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{editingProduct ? 'EDIT SERVICE OFFERING' : 'NEW SERVICE OFFERING'}</h3>
              <button className="close-modal" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>CAPABILITY</label>
                  <select
                    value={formData.capability}
                    onChange={(e) => setFormData({ ...formData, capability: e.target.value })}
                  >
                    <option value="BRANDING">BRANDING</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="DESIGN">DESIGN</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>SORT ORDER</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label>PRODUCT</label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full">
                  <label>SCOPE</label>
                  <textarea
                    rows="4"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <label className="form-group checkbox">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>SHOW ON PUBLIC PRODUCT TABLE</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="admin-btn approve wide" disabled={isSubmitting}>
                  {isSubmitting ? 'SAVING...' : 'SAVE OFFERING'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
