import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArchiveIcon, UnarchiveIcon, TrashIcon } from './Icons';

export default function ShopTab({
  squareItems,
  fetchingCatalog,
  squareError,
  fetchSquareCatalog,
  preorders,
  preordersLoading,
  fetchPreorders,
  showToast,
  triggerConfirm
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPreorder, setEditingPreorder] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    goal_quantity: 100,
    end_date: '',
    description: '',
    category: 'LIMITED DROP',
    image_url: '',
    status: 'draft',
    price: 0
  });

  async function handleCreatePreorder() {
    if (!selectedItem) return;

    const { error } = await supabase
      .from('merch_preorders')
      .insert([{
        square_item_id: selectedItem.id,
        item_name: selectedItem.name,
        goal_quantity: parseInt(formData.goal_quantity),
        current_quantity: 0,
        end_date: formData.end_date,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        image_url: selectedItem.imageUrl || '',
        price: parseInt(formData.price)
      }]);

    if (error) {
      showToast('Error creating preorder: ' + error.message, 'error');
    } else {
      showToast('Preorder drop launched successfully!');
      setIsCreating(false);
      setSelectedItem(null);
      fetchPreorders();
    }
  }

  async function handleUpdatePreorder() {
    if (!editingPreorder) return;

    const { error } = await supabase
      .from('merch_preorders')
      .update({
        square_item_id: formData.square_item_id,
        item_name: formData.item_name,
        goal_quantity: parseInt(formData.goal_quantity),
        end_date: formData.end_date,
        description: formData.description,
        category: formData.category,
        image_url: formData.image_url,
        status: formData.status,
        price: parseInt(formData.price)
      })
      .eq('id', editingPreorder.id);

    if (error) {
      showToast('Update failed: ' + error.message, 'error');
    } else {
      showToast('Preorder updated successfully!');
      setIsEditing(false);
      setEditingPreorder(null);
      fetchPreorders();
    }
  }

  async function deletePreorder(id) {
    triggerConfirm('Are you sure you want to delete this preorder permanently?', async () => {
      const { error } = await supabase
        .from('merch_preorders')
        .delete()
        .eq('id', id);

      if (error) showToast('Delete failed: ' + error.message, 'error');
      else {
        showToast('Preorder deleted.');
        fetchPreorders();
      }
    });
  }

  function openEditModal(po) {
    setEditingPreorder(po);
    setFormData({
      square_item_id: po.square_item_id,
      item_name: po.item_name,
      goal_quantity: po.goal_quantity,
      end_date: po.end_date ? po.end_date.split('.')[0] : '', // Format for datetime-local
      description: po.description || '',
      category: po.category || 'LIMITED DROP',
      image_url: po.image_url || '',
      status: po.status || 'open',
      price: po.price || 0
    });
    setIsEditing(true);
  }

  async function updatePreorderStatus(id, status) {
    const { error } = await supabase
      .from('merch_preorders')
      .update({ status })
      .eq('id', id);

    if (error) showToast('Update failed: ' + error.message, 'error');
    else {
      showToast(`Status updated to ${status}`);
      fetchPreorders();
    }
  }

  return (
    <section className="admin-section" style={{ '--active-tab-color': '#ff0000' }}>
      
      {/* 1. ACTIVE PREORDERS SECTION */}
      <div className="section-header-flex">
        <h2 className="section-title">PREORDER DROPS</h2>
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
            onClick={() => setIsCreating(!isCreating)}
            style={{ backgroundColor: isCreating ? '#666' : '#ff0000' }}
          >
            {isCreating ? 'CANCEL' : 'CREATE NEW DROP'}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="setup-guide" style={{ marginBottom: '30px', borderLeftColor: '#ff0000' }}>
          <h3>LAUNCH NEW DROP</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div className="form-group">
              <label>SELECT PRODUCT FROM SQUARE</label>
              <select 
                className="admin-input" 
                onChange={(e) => {
                  const item = squareItems.find(i => i.id === e.target.value);
                  setSelectedItem(item);
                  if (item) {
                    // Set default price from first variation
                    setFormData({
                      ...formData, 
                      price: item.variations?.[0]?.price || 0
                    });
                  }
                }}
                value={selectedItem?.id || ''}
              >
                <option value="">-- SELECT AN ITEM --</option>
                {squareItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>CATEGORY LABEL</label>
              <input 
                type="text" 
                className="admin-input" 
                placeholder="e.g. LIMITED DROP"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>GOAL QUANTITY (UNITS)</label>
              <input 
                type="number" 
                className="admin-input" 
                value={formData.goal_quantity}
                onChange={e => setFormData({...formData, goal_quantity: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>END DATE</label>
              <input 
                type="datetime-local" 
                className="admin-input" 
                value={formData.end_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>PRICE (IN CENTS)</label>
              <input 
                type="number" 
                className="admin-input" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
              <span style={{ fontSize: '10px', color: '#888' }}>${(formData.price / 100).toFixed(2)}</span>
            </div>
            <div className="form-group">
              <label>INITIAL STATUS</label>
              <select 
                className="admin-input" 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="draft">DRAFT</option>
                <option value="open">OPEN (LIVE)</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>DROP DESCRIPTION</label>
              <textarea 
                className="admin-input" 
                rows="3"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <button 
            className="admin-btn" 
            style={{ marginTop: '20px', width: '100%' }}
            onClick={handleCreatePreorder}
            disabled={!selectedItem || !formData.end_date}
          >
            LAUNCH PREORDER DROP
          </button>
        </div>
      )}

      {isEditing && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h3>EDIT DROP: {editingPreorder.item_name}</h3>
                <a 
                  href={`https://squareup.com/dashboard/items/library/${editingPreorder.square_item_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn small"
                  style={{ textDecoration: 'none', color: '#666', border: '1px solid #ddd', background: 'white' }}
                >
                  VIEW IN SQUARE
                </a>
              </div>
              <button className="close-modal" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>CONNECTED SQUARE PRODUCT</label>
                  <select 
                    className="admin-input" 
                    value={formData.square_item_id}
                    onChange={(e) => {
                      const item = squareItems.find(i => i.id === e.target.value);
                      if (item) {
                        setFormData({
                          ...formData,
                          square_item_id: item.id,
                          item_name: item.name,
                          price: item.variations?.[0]?.price || formData.price,
                          image_url: item.imageUrl || formData.image_url
                        });
                      }
                    }}
                  >
                    <option value="">-- SELECT AN ITEM --</option>
                    {squareItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>CATEGORY LABEL</label>
                  <input 
                    type="text" 
                    className="admin-input" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>GOAL QUANTITY</label>
                  <input 
                    type="number" 
                    className="admin-input" 
                    value={formData.goal_quantity}
                    onChange={e => setFormData({...formData, goal_quantity: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>PRICE (CENTS)</label>
                  <input 
                    type="number" 
                    className="admin-input" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                  <span style={{ fontSize: '10px', color: '#888' }}>${(formData.price / 100).toFixed(2)}</span>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>END DATE</label>
                  <input 
                    type="datetime-local" 
                    className="admin-input" 
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>DESCRIPTION</label>
                  <textarea 
                    className="admin-input" 
                    rows="3"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>DROP STATUS</label>
                  <select 
                    className="admin-input" 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="draft">DRAFT</option>
                    <option value="open">OPEN (LIVE)</option>
                    <option value="production">PRODUCTION</option>
                    <option value="shipped">SHIPPED</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>IMAGE URL (AUTO-PULLED FROM SQUARE)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      className="admin-input" 
                      value={formData.image_url}
                      onChange={e => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://..."
                    />
                    <button 
                      className="admin-btn small" 
                      onClick={() => {
                        const squareItem = squareItems.find(i => i.id === editingPreorder.square_item_id);
                        if (squareItem?.imageUrl) {
                          setFormData({...formData, image_url: squareItem.imageUrl});
                          showToast('Image URL pulled from Square Catalog!');
                        } else {
                          showToast('No image found in Square for this item.', 'error');
                        }
                      }}
                    >
                      SYNC
                    </button>
                  </div>
                </div>
              </div>
              <button 
                className="admin-btn wide approve" 
                style={{ marginTop: '20px' }}
                onClick={handleUpdatePreorder}
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="requests-table-container" style={{ marginBottom: '50px' }}>
        {preordersLoading ? (
          <p className="loading-text">LOADING PREORDERS...</p>
        ) : preorders.length === 0 ? (
          <p className="loading-text">NO ACTIVE PREORDERS FOUND.</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>ITEM NAME</th>
                <th>PROGRESS</th>
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
                    <div style={{ width: '100px', height: '8px', background: '#eee', position: 'relative', marginBottom: '5px' }}>
                      <div style={{ 
                        position: 'absolute', 
                        left: 0, top: 0, height: '100%', 
                        width: `${Math.min(100, (po.current_quantity / po.goal_quantity) * 100)}%`,
                        background: '#ff0000'
                      }} />
                    </div>
                    {po.current_quantity} / {po.goal_quantity}
                  </td>
                  <td>{new Date(po.end_date).toLocaleDateString()}</td>
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
                      <div className="secondary-actions" style={{ display: 'flex', gap: '10px', marginLeft: '10px' }}>
                        {po.status !== 'archived' ? (
                          <button
                            className="icon-btn archive-btn"
                            title="Archive Drop"
                            onClick={() => updatePreorderStatus(po.id, 'archived')}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}
                          >
                            <ArchiveIcon />
                          </button>
                        ) : (
                          <button
                            className="icon-btn unarchive-btn"
                            title="Unarchive Drop"
                            onClick={() => updatePreorderStatus(po.id, 'open')}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}
                          >
                            <UnarchiveIcon />
                          </button>
                        )}
                        <button
                          className="icon-btn delete-btn"
                          style={{ color: '#991b1b', background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}
                          title="Delete Drop"
                          onClick={() => deletePreorder(po.id)}
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

      {/* 2. RAW SQUARE CATALOG SECTION */}
      <div className="section-header-flex">
        <h2 className="section-title">SQUARE PRODUCT CATALOG
          <span className="status-pill pending" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>READ ONLY</span>
        </h2>
        <button className="admin-btn" onClick={fetchSquareCatalog} disabled={fetchingCatalog}>
          {fetchingCatalog ? 'REFRESHING...' : 'REFRESH CATALOG'}
        </button>
      </div>
      
      <div className="requests-table-container">
        {fetchingCatalog ? (
          <p className="loading-text">FETCHING SQUARE CATALOG...</p>
        ) : squareError ? (
          <div className="setup-guide">
            <p>ERROR: {squareError}</p>
          </div>
        ) : squareItems.length === 0 ? (
          <p className="loading-text">NO PRODUCTS FOUND IN SQUARE.</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>PREVIEW</th>
                <th>PRODUCT NAME</th>
                <th>VARIATION</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>SOLD (SQUARE)</th>
                <th>ID (FOR REFERENCE)</th>
              </tr>
            </thead>
            <tbody>
              {squareItems.map((item) => (
                item.variations.map((v, idx) => {
                  return (
                    <tr key={v.id}>
                      {idx === 0 ? (
                        <>
                          <td rowSpan={item.variations.length}>
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt="" 
                                style={{ width: '40px', height: '40px', objectFit: 'cover', border: '1px solid #eee' }} 
                              />
                            ) : (
                              <div style={{ width: '40px', height: '40px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#ccc' }}>NO IMG</div>
                            )}
                          </td>
                          <td rowSpan={item.variations.length}>
                            <a 
                              href={`https://squareup.com/dashboard/items/library/${item.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title="Edit in Square Dashboard"
                              style={{ 
                                color: '#000000', 
                                textDecoration: 'none',
                                fontWeight: 'bold',
                                borderBottom: '1px solid transparent',
                                transition: 'border-color 0.2s ease'
                              }}
                              onMouseOver={e => e.currentTarget.style.borderBottomColor = '#000000'}
                              onMouseOut={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                            >
                              {item.name.toUpperCase()}
                            </a>
                          </td>
                        </>
                      ) : null}
                      <td>{v.name}</td>
                      <td>${(v.price / 100).toFixed(2)}</td>
                      <td>
                        {v.trackInventory ? v.quantity : 'N/A'}
                      </td>
                      <td>
                        <span style={{ color: v.sold > 0 ? '#ff0000' : '#ccc', fontWeight: v.sold > 0 ? 'bold' : 'normal' }}>
                          {v.sold} sold
                        </span>
                      </td>
                      <td style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>{v.id}</td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
