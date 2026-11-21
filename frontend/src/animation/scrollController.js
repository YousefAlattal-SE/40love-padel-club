let activeLenis = null

export function setActiveLenis(instance) {
  activeLenis = instance
}

export function scrollToTop() {
  if (activeLenis) {
    activeLenis.scrollTo(0)
    return
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
}
