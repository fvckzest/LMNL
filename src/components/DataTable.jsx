export default function DataTable({ columns, rows, className = '', templateColumns }) {
  const classes = ['data-table', 'theme-record-table', className].filter(Boolean).join(' ');
  const tableStyle = {
    '--data-table-columns': templateColumns || `repeat(${columns.length}, minmax(0, 1fr))`,
  };

  return (
    <div className={classes} role="table" style={tableStyle}>
      <div className="data-table__row data-table__row--head theme-record-table__row theme-record-table__row--head" role="row">
        {columns.map((column) => (
          <span key={column} className="data-table__cell data-table__cell--head theme-record-table__cell theme-record-table__cell--head theme-label" role="columnheader">
            {column}
          </span>
        ))}
      </div>

      {rows.map((row, rowIndex) => (
        <div key={row.id || rowIndex} className="data-table__row theme-record-table__row" role="row">
          {row.cells.map((cell, cellIndex) => (
            <span key={`${row.id || rowIndex}-${cellIndex}`} className="data-table__cell theme-record-table__cell" role="cell">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
