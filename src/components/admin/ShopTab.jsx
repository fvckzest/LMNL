export default function ShopTab({
  squareItems,
  fetchingCatalog,
  squareError,
  fetchSquareCatalog
}) {
  return (
    <section className="admin-section" style={{ '--active-tab-color': '#ff0000' }}>
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
                <th>PRODUCT NAME</th>
                <th>VARIATION</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>ID (FOR REFERENCE)</th>
              </tr>
            </thead>
            <tbody>
              {squareItems.map((item) => (
                item.variations.map((v, idx) => (
                  <tr key={v.id}>
                    {idx === 0 ? (
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
                    ) : null}
                    <td>{v.name}</td>
                    <td>${(v.price / 100).toFixed(2)}</td>
                    <td>
                      {v.trackInventory ? v.quantity : 'N/A'}
                    </td>
                    <td style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>{v.id}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
