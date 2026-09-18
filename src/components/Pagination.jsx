export default function Pagination({ page, totalPages, totalCount, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <span className="pagination-total">{totalCount} total</span>
      <button
        type="button"
        className="pagination-btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        &lsaquo; Previous
      </button>
      <span className="pagination-page">{page} of {totalPages}</span>
      <button
        type="button"
        className="pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next &rsaquo;
      </button>
    </div>
  );
}
