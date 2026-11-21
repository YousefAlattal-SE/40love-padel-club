import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { setActiveLenis } from './scrollController'

export default function ScrollAnimations() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis = null
    let ticker = null

    const stopLenis = () => {
      if (!lenis) return

      gsap.ticker.remove(ticker)
      lenis.destroy()
      setActiveLenis(null)
      lenis = null
      ticker = null
      gsap.ticker.lagSmoothing(500, 33)
    }

    const startLenis = () => {
      if (lenis || motionPreference.matches) return

      lenis = new Lenis({
        autoRaf: false,
        anchors: true,
        lerp: 0.12,
        stopInertiaOnNavigate: true,
      })
      setActiveLenis(lenis)
      lenis.on('scroll', ScrollTrigger.update)

      ticker = (time) => lenis?.raf(time * 1000)
      gsap.ticker.add(ticker)
      gsap.ticker.lagSmoothing(0)
    }

    const syncMotionPreference = () => {
      if (motionPreference.matches) stopLenis()
      else startLenis()
    }

    syncMotionPreference()
    motionPreference.addEventListener('change', syncMotionPreference)

    return () => {
      motionPreference.removeEventListener('change', syncMotionPreference)
      stopLenis()
    }
  }, [])

  useLayoutEffect(() => {
    ScrollTrigger.refresh()
  }, [pathname, search, hash])

  return null
}
