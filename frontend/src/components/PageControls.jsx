export default function PageControls({ page, count, onPage, ar, loading }) {
  if (page === 0 && count < 25) return null
  return (
    <nav aria-label={ar ? 'صفحات النتائج' : 'Result pages'}>
      <button type="button" disabled={loading || page === 0} onClick={() => onPage(page - 1)}>
        {ar ? 'السابق' : 'Previous'}
      </button>
      <span aria-live="polite"> {page + 1} </span>
      <button type="button" disabled={loading || count < 25} onClick={() => onPage(page + 1)}>
        {ar ? 'التالي' : 'Next'}
      </button>
    </nav>
  )
}
