import { useState } from 'react';
import { apiPost } from '../../lib/api';
import { PinIcon } from './Icons';
import { ArchiveToggleButton, DeleteActionButton } from './ActionButtons';

const PERSISTENT_END_DATE = '2099-12-31T23:59:00.000Z';

function formatDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseWholeNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPersistentEndDate(value) {
  return value === PERSISTENT_END_DATE;
}

 export default function ShopTab({
   squareItems,
   fetchingCatalog,
   squareError,
   fetchSquareCatalog,
   preorders,
   preordersLoading,
   fetchPreorders,
   showToast,
   triggerConfirm,
   tickets = [],
   events = [],
   pinnedSections = [],
   onTogglePin = () => {},
   renderMode = 'all'
 }) {
   const sectionIds = {
     products: 'merch_preorders',
     catalog: 'square_catalog'
   };

   const shouldRender = (sectionId) => {
     if (renderMode === 'all') return true;
     const isPinned = pinnedSections.includes(sectionId);
     if (renderMode === 'pinned') return isPinned;
     if (renderMode === 'unpinned') return !isPinned;
     return true;
   };
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPreorder, setEditingPreorder] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedItems, setExpandedItems] = useState({}); // Track which catalog items are expanded
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    goal_quantity: 100,
    end_date: '',
    description: '',
    category: 'LIMITED DROP',
    image_url: '',
    status: 'draft',
    price: 0,
    type: 'preorder' // 'preorder' or 'persistent'
  });

  function openCreateModal() {
    setSelectedItem(null);
    setFormData({
      goal_quantity: 100,
      end_date: '',
      description: '',
      category: 'LIMITED DROP',
      image_url: '',
      status: 'draft',
      price: 0,
      type: 'preorder'
    });
    setIsCreating(true);
  }

  async function handleCreatePreorder() {
    if (!selectedItem) return;

    const isPersistent = formData.type === 'persistent';
    const goalQuantity = isPersistent ? 0 : parseWholeNumber(formData.goal_quantity);

    if (!isPersistent && !formData.end_date) {
      showToast('An end date is required for preorder drops.', 'error');
      return;
    }

    if (!isPersistent && (goalQuantity === null || goalQuantity < 1)) {
      showToast('Goal quantity must be at least 1 for preorder drops.', 'error');
      return;
    }

    try {
      await apiPost('/api/preorders', {
        square_item_id: selectedItem.id,
        item_name: selectedItem.name,
        goal_quantity: goalQuantity,
        current_quantity: 0,
        end_date: isPersistent ? null : formData.end_date,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        image_url: selectedItem.imageUrl || ''
      }, { auth: true });
      showToast('Product added successfully!');
      setIsCreating(false);
      setSelectedItem(null);
      fetchPreorders();
    } catch (error) {
      showToast('Error creating product: ' + error.message, 'error');
    }
  }

  async function handleUpdatePreorder() {
    if (!editingPreorder) return;

    const isPersistent = formData.type === 'persistent';
    const goalQuantity = isPersistent ? 0 : parseWholeNumber(formData.goal_quantity);

    if (!formData.square_item_id || !formData.item_name) {
      showToast('Please choose a connected Square product before saving.', 'error');
      return;
    }

    if (!isPersistent && !formData.end_date) {
      showToast('An end date is required for preorder drops.', 'error');
      return;
    }

    if (!isPersistent && (goalQuantity === null || goalQuantity < 1)) {
      showToast('Goal quantity must be at least 1 for preorder drops.', 'error');
      return;
    }

    try {
      await apiPost('/api/preorders', {
        id: editingPreorder.id,
        square_item_id: formData.square_item_id,
        item_name: formData.item_name,
        goal_quantity: goalQuantity,
        end_date: isPersistent ? null : formData.end_date,
        description: formData.description,
        category: formData.category,
        image_url: formData.image_url,
        status: formData.status
      }, { auth: true })
      ;
      showToast('Product updated successfully!');
      setIsEditing(false);
      setEditingPreorder(null);
      fetchPreorders();
    } catch (error) {
      showToast('Update failed: ' + error.message, 'error');
    }
  }

  async function deletePreorder(id) {
    triggerConfirm('Are you sure you want to delete this preorder permanently?', async () => {
      try {
        await apiPost('/api/preorders', { action: 'delete', id }, { auth: true });
        showToast('Preorder deleted.');
        fetchPreorders();
      } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
      }
    });
  }

  function openEditModal(po) {
    setEditingPreorder(po);
    const squareItem = squareItems.find(i => i.id === po.square_item_id);
    const derivedPrice = squareItem?.variations?.[0]?.price || po.price || 0;

    setFormData({
      square_item_id: po.square_item_id,
      item_name: po.item_name,
      goal_quantity: po.goal_quantity,
      end_date: po.goal_quantity > 0 ? formatDateTimeLocal(po.end_date) : '',
      description: po.description || '',
      category: po.category || 'LIMITED DROP',
      image_url: po.image_url || '',
      status: po.status || 'open',
      price: derivedPrice,
      type: po.goal_quantity > 0 ? 'preorder' : 'persistent'
    });
    setIsEditing(true);
  }

  async function updatePreorderStatus(id, status) {
    try {
      await apiPost('/api/preorders', { action: 'update-status', id, status }, { auth: true });
      showToast(`Status updated to ${status}`);
      fetchPreorders();
    } catch (error) {
      showToast('Update failed: ' + error.message, 'error');
    }
  }

  function getDynamicSold(po) {
    if (!po.square_item_id) return po.current_quantity || 0;

    // 1. Find the Square item to get its variations
    const squareItem = squareItems.find(item => item.id === po.square_item_id);
    if (!squareItem) return po.current_quantity || 0;

    const variationIds = squareItem.variations.map(v => v.id);

    // 2. Find all events linked to these variation IDs
    const linkedEventIds = events
      .filter(e => variationIds.includes(e.square_variation_id))
      .map(e => e.id);

    // 3. Count tickets for those events
    const ticketCount = tickets.filter(t => linkedEventIds.includes(t.event_id)).length;

    // Return the max of dynamic count and stored count to be safe
    return Math.max(ticketCount, po.current_quantity || 0);
  }

  return (
     <>
      {/* 1. SHOP PRODUCTS SECTION */}
      {shouldRender(sectionIds.products) && (
      <section className="admin-section" style={{ '--active-tab-color': '#ff0000' }}>
        <div className="section-header-flex">
          <div className="section-title-container">
            <button 
              className={`pin-toggle-btn ${pinnedSections.includes(sectionIds.products) ? 'pinned' : ''}`}
              onClick={() => onTogglePin(sectionIds.products)}
              title={pinnedSections.includes(sectionIds.products) ? 'Unpin from top' : 'Pin to top'}
            >
              <PinIcon filled={pinnedSections.includes(sectionIds.products)} />
            </button>
            <h2 className="section-title">SHOP PRODUCTS</h2>
          </div>
          <div className="action-buttons">
            <button 
              className={`admin-btn small ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(!showArchived)}
              style={{ marginRight: '10px' }}
            >
              {showArchived ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'} ({preorders.filter(p => p.status === 'archived').length})
            </button>
            <button 
              className="admin-btn" 
              onClick={openCreateModal}
            >
              ADD PRODUCT TO SHOP
            </button>
          </div>
        </div>

        {/* Stats for Shop Products (Added for consistency) */}
        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-label">TOTAL DROPS</span>
            <span className="stat-value">{preorders.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">ACTIVE</span>
            <span className="stat-value">{preorders.filter(p => p.status === 'open').length}</span>
          </div>
        </div>

        <div className="events-table-container admin-table-shell">
          {preordersLoading ? (
            <p className="loading-text">LOADING PREORDERS...</p>
          ) : preorders.length === 0 ? (
            <p className="loading-text">NO ACTIVE PREORDERS FOUND.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ITEM NAME</th>
                  <th>TYPE</th>
                  <th>PROGRESS / STOCK</th>
                  <th>END DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {preorders
                  .filter(po => showArchived ? true : po.status !== 'archived')
                  .map((po) => (
                  <tr key={po.id}>
                    <td>
                      <a 
                        href={`https://squareup.com/dashboard/items/library/${po.square_item_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View in Square Dashboard"
                        className="event-name-link"
                        style={{ fontWeight: 'bold' }}
                      >
                        {po.item_name}
                      </a>
                      <div style={{ fontSize: '10px', color: '#888' }}>{po.category}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: po.goal_quantity > 0 ? '#ff0000' : '#666' }}>
                        {po.goal_quantity > 0 ? 'PREORDER' : 'PERSISTENT'}
                      </span>
                    </td>
                    <td>
                      {po.goal_quantity > 0 ? (
                        <>
                          <div style={{ width: '100px', height: '8px', background: '#eee', position: 'relative', marginBottom: '5px' }}>
                            <div style={{ 
                              position: 'absolute', 
                              left: 0, top: 0, height: '100%', 
                              width: `${Math.min(100, (getDynamicSold(po) / po.goal_quantity) * 100)}%`,
                              background: '#ff0000'
                            }} />
                          </div>
                          {getDynamicSold(po)} / {po.goal_quantity}
                        </>
                      ) : (
                        <span style={{ color: '#888' }}>ALWAYS OPEN</span>
                      )}
                    </td>
                    <td>{po.goal_quantity > 0 && po.end_date && !isPersistentEndDate(po.end_date) ? new Date(po.end_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`status-pill ${po.status}`}>
                        {po.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="actions-wrapper">
                        <div className="main-actions">
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="admin-btn" onClick={() => openEditModal(po)}>EDIT</button>
                          </div>
                        </div>
                        <div className="secondary-actions" style={{ marginLeft: '10px' }}>
                          <ArchiveToggleButton
                            isArchived={po.status === 'archived'}
                            archiveTitle="Archive Drop"
                            unarchiveTitle="Unarchive Drop"
                            onArchive={() => updatePreorderStatus(po.id, 'archived')}
                            onUnarchive={() => updatePreorderStatus(po.id, 'open')}
                          />
                          <DeleteActionButton
                            title="Delete Drop"
                            onClick={() => deletePreorder(po.id)}
                          />
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
      )}

      {/* 2. RAW SQUARE CATALOG SECTION */}
      {shouldRender(sectionIds.catalog) && (
      <section className="admin-section" style={{ '--active-tab-color': '#ff0000' }}>
        <div className="section-header-flex">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
            <div className="section-title-container">
              <button 
                className={`pin-toggle-btn ${pinnedSections.includes(sectionIds.catalog) ? 'pinned' : ''}`}
                onClick={() => onTogglePin(sectionIds.catalog)}
                title={pinnedSections.includes(sectionIds.catalog) ? 'Unpin from top' : 'Pin to top'}
              >
                <PinIcon filled={pinnedSections.includes(sectionIds.catalog)} />
              </button>
              <h2 className="section-title">SQUARE PRODUCT CATALOG</h2>
            </div>
            <span className="status-pill pending">READ ONLY</span>
          </div>
          <button className="admin-btn" onClick={fetchSquareCatalog} disabled={fetchingCatalog}>
            {fetchingCatalog ? 'REFRESHING...' : 'REFRESH CATALOG'}
          </button>
        </div>

        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-label">CATALOG ITEMS</span>
            <span className="stat-value">{squareItems.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">TOTAL VARIATIONS</span>
            <span className="stat-value">{squareItems.reduce((acc, item) => acc + item.variations.length, 0)}</span>
          </div>
        </div>
        
        <div className="events-table-container admin-table-shell">
          {fetchingCatalog ? (
            <p className="loading-text">FETCHING SQUARE CATALOG...</p>
          ) : squareError ? (
            <div className="setup-guide">
              <p>ERROR: {squareError}</p>
            </div>
          ) : squareItems.length === 0 ? (
            <p className="loading-text">NO PRODUCTS FOUND IN SQUARE.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>PRODUCT NAME</th>
                  <th>VARIATION</th>
                  <th>PRICE</th>
                  <th>STOCK</th>
                  <th>SOLD (DB)</th>
                  <th>ID (FOR REFERENCE)</th>
                </tr>
              </thead>
              <tbody>
                {squareItems.map((item) => {
                  const isExpanded = expandedItems[item.id];
                  const totalSold = item.variations.reduce((sum, v) => sum + (v.sold || 0), 0);
                  const totalStock = item.variations.reduce((sum, v) => sum + (v.trackInventory ? (v.quantity || 0) : 0), 0);
                  const hasInventoryTracking = item.variations.some(v => v.trackInventory);

                  return (
                    <tr key={item.id} className={isExpanded ? 'expanded-parent' : ''}>
                      <td 
                        className="community-event-arrow-cell"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <button 
                          onClick={() => setExpandedItems({ ...expandedItems, [item.id]: !isExpanded })}
                          style={{ 
                            background: 'transparent', border: 'none', cursor: 'pointer', 
                            fontSize: '12px', color: '#666', padding: '5px',
                            ['--toggle-color']: '#ff0000',
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease'
                          }}
                        >
                          <span className="admin-toggle-arrow">▶</span>
                        </button>
                      </td>
                      <td 
                        className="shop-product-name-cell"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <a 
                          href={`https://squareup.com/dashboard/items/library/${item.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Edit in Square Dashboard"
                          className="event-name-link"
                        >
                          {item.name.toUpperCase()}
                        </a>
                      </td>
                      <td>
                        {isExpanded ? (
                          <div className="variations-expanded">
                            {item.variations.map(v => (
                              <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px' }}>
                                {v.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#888' }}>
                            {item.variations.length} VARIATION{item.variations.length !== 1 ? 'S' : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        {isExpanded ? (
                          <div className="variations-expanded">
                            {item.variations.map(v => (
                              <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px' }}>
                                ${(v.price / 100).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>
                            {item.variations.length > 1 
                              ? `$${(Math.min(...item.variations.map(v => v.price)) / 100).toFixed(2)}+`
                              : `$${(item.variations[0]?.price / 100).toFixed(2)}`
                            }
                          </span>
                        )}
                      </td>
                      <td>
                        {isExpanded ? (
                          <div className="variations-expanded">
                            {item.variations.map(v => (
                              <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px' }}>
                                {v.trackInventory ? v.quantity : 'N/A'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>{hasInventoryTracking ? totalStock : 'N/A'}</span>
                        )}
                      </td>
                      <td>
                        {isExpanded ? (
                          <div className="variations-expanded">
                            {item.variations.map(v => (
                              <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px', color: v.sold > 0 ? '#ff0000' : '#ccc', fontWeight: v.sold > 0 ? 'bold' : 'normal' }}>
                                {v.sold} sold
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: totalSold > 0 ? '#ff0000' : '#ccc', fontWeight: totalSold > 0 ? 'bold' : 'normal' }}>
                            {totalSold} sold
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '10px', color: '#999', fontFamily: 'var(--lmnl-font-mono)' }}>
                        {isExpanded ? (
                          <div className="variations-expanded">
                            {item.variations.map(v => (
                              <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                                {v.id}
                              </div>
                            ))}
                          </div>
                        ) : (
                          item.id
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {(isCreating || isEditing) && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>{isEditing ? 'EDIT PRODUCT' : 'ADD PRODUCT TO SHOP'}</h3>
              <button 
                className="close-modal" 
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  setEditingPreorder(null);
                  setSelectedItem(null);
                }}
              >
                ×
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (isEditing) handleUpdatePreorder();
                else handleCreatePreorder();
              }} 
              className="modal-form"
            >
              <div className="form-grid">
                <div className="form-group full">
                  <label>SQUARE PRODUCT</label>
                  {isEditing ? (
                    <input type="text" value={formData.item_name} disabled style={{ background: '#f5f5f5' }} />
                  ) : (
                    <select 
                      required
                      value={selectedItem?.id || ''} 
                      onChange={e => {
                        const item = squareItems.find(i => i.id === e.target.value);
                        setSelectedItem(item);
                        if (item) {
                          setFormData({
                            ...formData,
                            image_url: item.imageUrl || '',
                            description: item.description || formData.description
                          });
                        }
                      }}
                    >
                      <option value="">-- SELECT FROM SQUARE CATALOG --</option>
                      {squareItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>
                      ))}
                    </select>
                  )}
                  <p className="form-help">Choose a product from your Square Catalog to link.</p>
                </div>

                <div className="form-group">
                  <label>DROP TYPE</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="preorder">PREORDER DROP (LIMITED TIME/QTY)</option>
                    <option value="persistent">PERSISTENT ITEM (ALWAYS OPEN)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>CATEGORY / LABEL</label>
                  <input 
                    type="text" 
                    placeholder="e.g. LIMITED DROP, APPAREL" 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value.toUpperCase() })} 
                  />
                </div>

                {formData.type === 'preorder' && (
                  <>
                    <div className="form-group">
                      <label>GOAL QUANTITY</label>
                      <input 
                        required
                        type="number" 
                        value={formData.goal_quantity} 
                        onChange={e => setFormData({ ...formData, goal_quantity: e.target.value })} 
                      />
                    </div>

                    <div className="form-group">
                      <label>DROP END DATE</label>
                      <input 
                        required
                        type="datetime-local" 
                        value={formData.end_date} 
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })} 
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>DISPLAY STATUS</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">DRAFT (HIDDEN)</option>
                    <option value="open">OPEN (LIVE)</option>
                    <option value="sold_out">SOLD OUT</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>CUSTOM IMAGE URL (OPTIONAL)</label>
                  <input 
                    type="text" 
                    placeholder="Override Square image" 
                    value={formData.image_url} 
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })} 
                  />
                </div>

                <div className="form-group full">
                  <label>PRODUCT DESCRIPTION</label>
                  <textarea 
                    rows="4" 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  />
                  <p className="form-help">This is shown on the preorder page. Leave blank to use Square's description.</p>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="admin-btn approve wide">
                  {isEditing ? 'UPDATE PRODUCT' : 'CREATE DROP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
