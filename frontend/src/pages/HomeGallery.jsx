import { useRef, useState } from 'react'
import { FORTYLOVE_CONTENT as C } from '../content'

const photos = C.gallery

function PhotoArrow({ previous = false }) {
  return <svg className={previous ? 'club-photo-arrow is-previous' : 'club-photo-arrow'} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
}

export default function HomeGallery({ locale, thumbnails = false }) {
  const arabic = locale === 'ar'
  const [index, setIndex] = useState(0)
  const viewer = useRef(null)
  const current = photos[index]
  const caption = current.caption[locale]
  const alt = arabic ? current.altAr : current.alt
  const format = new Intl.NumberFormat(arabic ? 'ar-JO-u-nu-arab' : 'en', { minimumIntegerDigits: 2 })

  function move(step) {
    setIndex((value) => (value + step + photos.length) % photos.length)
  }

  function onArrowKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const forwardKey = arabic ? 'ArrowLeft' : 'ArrowRight'
    move(event.key === forwardKey ? 1 : -1)
  }

  function controls() {
    return (
      <div className="club-photo-controls">
        <button type="button" aria-label={arabic ? 'الصورة السابقة' : 'Previous photo'} onClick={() => move(-1)}><PhotoArrow previous /></button>
        <button type="button" aria-label={arabic ? 'الصورة التالية' : 'Next photo'} onClick={() => move(1)}><PhotoArrow /></button>
      </div>
    )
  }

  return (
    <figure className="club-photo" aria-label={arabic ? 'صور النادي' : 'Club photographs'} onKeyDown={onArrowKey}>
      <button type="button" className="club-photo-open" onClick={() => viewer.current.showModal()} aria-haspopup="dialog" aria-label={arabic ? 'تكبير الصورة' : 'Enlarge photograph'}>
        <img key={current.image} src={current.image} alt={alt} style={{ objectPosition: current.position }} fetchPriority="high" width="1179" height="1570" />
        <span className="club-photo-expand" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" /></svg></span>
      </button>
      <figcaption className="club-photo-caption">
        <span className="club-photo-description" aria-live="polite" aria-atomic="true">
          <bdi className="club-photo-count" dir="ltr">{format.format(index + 1)} / {format.format(photos.length)}</bdi>
          <span>{caption}</span>
        </span>
        {controls()}
      </figcaption>
      {thumbnails && <div className="club-photo-index">
        {photos.map((photo, i) => <button key={photo.image} type="button" aria-pressed={i === index}
          onClick={() => { setIndex(i); viewer.current.showModal() }}>
          <img src={photo.image} alt="" loading="lazy" style={{ objectPosition: photo.position }} />
          <span>{photo.caption[locale]}</span>
        </button>)}
      </div>}
      <dialog ref={viewer} className="club-photo-dialog" data-lenis-prevent aria-label={arabic ? 'عرض صور النادي' : 'Club photo viewer'} onClick={(event) => { if (event.target === event.currentTarget) viewer.current.close() }}>
        <div className="club-photo-view">
          <button type="button" className="club-photo-close" onClick={() => viewer.current.close()} autoFocus>{arabic ? 'إغلاق' : 'Close'} <span aria-hidden="true">×</span></button>
          <img src={current.image} alt={alt} />
          <div className="club-photo-caption"><span aria-live="polite">{caption}</span>{controls()}</div>
        </div>
      </dialog>
    </figure>
  )
}
