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

    const { error } = await supabase
      .from('merch_preorders')
      .insert([{
        square_item_id: selectedItem.id,
        item_name: selectedItem.name,
        goal_quantity: isPersistent ? 0 : parseInt(formData.goal_quantity),
        current_quantity: 0,
        end_date: isPersistent ? null : formData.end_date,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        image_url: selectedItem.imageUrl || '',
        price: parseInt(formData.price)
      }]);

    if (error) {
      showToast('Error creating product: ' + error.message, 'error');
    } else {
      showToast('Product added successfully!');
      setIsCreating(false);
      setSelectedItem(null);
      fetchPreorders();
    }
  }

  async function handleUpdatePreorder() {
    if (!editingPreorder) return;

    const isPersistent = formData.type === 'persistent';

    const { error } = await supabase
      .from('merch_preorders')
      .update({
        square_item_id: formData.square_item_id,
        item_name: formData.item_name,
        goal_quantity: isPersistent ? 0 : parseInt(formData.goal_quantity),
        end_date: isPersistent ? null : formData.end_date,
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
      showToast('Product updated successfully!');
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
    const squareItem = squareItems.find(i => i.id === po.square_item_id);
    const derivedPrice = squareItem?.variations?.[0]?.price || po.price || 0;

    setFormData({
      square_item_id: po.square_item_id,
      item_name: po.item_name,
      goal_quantity: po.goal_quantity,
      end_date: po.end_date ? po.end_date.split('.')[0] : '', // Format for datetime-local
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
      
      {/* 1. SHOP PRODUCTS SECTION */}
      <div className="section-header-flex">
        <h2 className="section-title">SHOP PRODUCTS</h2>
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

      {isCreating && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h3>ADD NEW PRODUCT</h3>
              <button className="close-modal" onClick={() => setIsCreating(false)}>×</button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>PRODUCT TYPE</label>
                  <select 
                    className="admin-input"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="preorder">PREORDER DROP (WITH TIMER & PROGRESS)</option>
                    <option value="persistent">PERSISTENT ITEM (ALWAYS AVAILABLE)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>SELECT PRODUCT FROM SQUARE</label>
                  <select 
                    className="admin-input" 
                    onChange={(e) => {
                      const item = squareItems.find(i => i.id === e.target.value);
                      setSelectedItem(item);
                      if (item) {
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
                
                {formData.type === 'preorder' && (
                  <>
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
                  </>
                )}

                <div className="form-group">
                  <label>PRICE (FROM SQUARE)</label>
                  <div className="admin-input" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center' }}>
                    ${(formData.price / 100).toFixed(2)}
                  </div>
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
                  <label>PRODUCT DESCRIPTION</label>
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
                style={{ 
                  marginTop: '20px', 
                  width: '100%',
                  backgroundColor: 'white',
                  color: 'black',
                  border: '1px solid black',
                  padding: '12px',
                  fontWeight: 'bold'
                }}
                onClick={handleCreatePreorder}
                disabled={!selectedItem || (formData.type === 'preorder' && !formData.end_date)}
              >
                {formData.type === 'preorder' ? 'LAUNCH PREORDER DROP' : 'ADD TO SHOP'}
              </button>
            </div>
          </div>
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
                  <label>PRODUCT TYPE</label>
                  <select 
                    className="admin-input"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="preorder">PREORDER DROP (WITH TIMER & PROGRESS)</option>
                    <option value="persistent">PERSISTENT ITEM (ALWAYS AVAILABLE)</option>
                  </select>
                </div>
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
                          price: item.variations?.[0]?.price || 0,
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
                  <label>PRICE (FROM SQUARE)</label>
                  <div className="admin-input" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center' }}>
                    ${(formData.price / 100).toFixed(2)}
                  </div>
                </div>

                {formData.type === 'preorder' && (
                  <>
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
                      <label>END DATE</label>
                      <input 
                        type="datetime-local" 
                        className="admin-input" 
                        value={formData.end_date}
                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                      />
                    </div>
                  </>
                )}
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
                            width: `${Math.min(100, (po.current_quantity / po.goal_quantity) * 100)}%`,
                            background: '#ff0000'
                          }} />
                        </div>
                        {po.current_quantity} / {po.goal_quantity}
                      </>
                    ) : (
                      <span style={{ color: '#888' }}>ALWAYS OPEN</span>
                    )}
                  </td>
                  <td>{po.end_date ? new Date(po.end_date).toLocaleDateString() : 'N/A'}</td>
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
          <h2 className="section-title">SQUARE PRODUCT CATALOG</h2>
          <span className="status-pill pending">READ ONLY</span>
        </div>
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
                <th>PRODUCT NAME</th>
                <th>VARIATION</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>SOLD (SQUARE)</th>
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
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                          onClick={() => setExpandedItems({ ...expandedItems, [item.id]: !isExpanded })}
                          style={{ 
                            background: 'transparent', border: 'none', cursor: 'pointer', 
                            fontSize: '12px', color: '#666', padding: '5px',
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease'
                          }}
                        >
                          ▶
                        </button>
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
                      </div>
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
                    <td style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>
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
  );
}
