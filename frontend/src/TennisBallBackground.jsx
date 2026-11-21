/**
 * TennisBallBackground
 * --------------------
 * Animated floating tennis-ball canvas backdrop that automatically adapts to
 * the site's existing Light / Dark theme system (data-theme on <html>).
 *
 * - Reads document.documentElement.dataset.theme ('light' | 'dark').
 * - Watches for theme changes via MutationObserver → no page refresh needed.
 * - Respects prefers-reduced-motion: balls freeze when the user prefers no motion.
 * - Zero dependencies beyond React.
 */

import { useEffect, useRef, useCallback } from 'react'
import { gsap } from './animation/gsap'

/* ─── Theme-aware visual configs ─────────────────────────────────── */

const THEME = {
  light: {
    bg: 'transparent',                    // page bg handled by CSS
    ballFill: '#c8e64c',                  // classic ITFF felt yellow-green
    ballFill2: '#d4ed5a',                 // slight variation for depth
    lineColor: 'rgba(255,255,255,0.72)',   // seam lines on ball
    shadowColor: 'rgba(120,150,40,0.22)', // soft green-tinted shadow
    shadowBlur: 18,
    glowColor: 'rgba(180,220,50,0.0)',    // no glow in light mode
    opacity: 0.22,                        // subtle — won't compete with content
  },
  dark: {
    bg: 'transparent',
    ballFill: '#c8e64c',
    ballFill2: '#b8d63a',
    lineColor: 'rgba(255,255,255,0.55)',
    shadowColor: 'rgba(160,220,40,0.28)',
    shadowBlur: 28,
    glowColor: 'rgba(180,230,50,0.18)',   // neon glow for dark mode
    opacity: 0.25,
  },
}

/* ─── Ball physics & rendering ───────────────────────────────────── */

const BALL_COUNT = 10   // restrained decoration across the viewport
const SPEED_SCALE = 0.38   // overall speed multiplier (slow, ambient)
const MIN_RADIUS  = 18
const MAX_RADIUS  = 44

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

function createBall(canvasW, canvasH) {
  const r = randomBetween(MIN_RADIUS, MAX_RADIUS)
  return {
    x:   randomBetween(r, canvasW - r),
    y:   randomBetween(r, canvasH - r),
    r,
    vx:  (Math.random() < 0.5 ? 1 : -1) * randomBetween(0.28, 0.78) * SPEED_SCALE,
    vy:  (Math.random() < 0.5 ? 1 : -1) * randomBetween(0.28, 0.78) * SPEED_SCALE,
    spin: randomBetween(-0.025, 0.025),    // seam rotation speed (rad/frame)
    angle: Math.random() * Math.PI * 2,    // current seam angle
    phase: Math.random() * Math.PI * 2,    // float bob phase offset
    bobAmp: randomBetween(0.6, 1.4),       // vertical sinusoidal amplitude
    bobSpeed: randomBetween(0.004, 0.01),  // bob cycle speed
  }
}

/**
 * Draws one tennis ball at (x, y) with radius r.
 * Includes: fill, felt texture shimmer, seam curves, optional glow.
 */
function drawBall(ctx, ball, cfg) {
  const { x, y, r, angle } = ball

  ctx.save()
  ctx.translate(x, y)

  // ── Glow (dark mode only) ──────────────────────────────────────
  if (cfg.glowColor && cfg.glowColor !== 'rgba(180,230,50,0.0)') {
    ctx.shadowColor = cfg.glowColor
    ctx.shadowBlur  = cfg.shadowBlur * 1.6
  }

  // ── Drop shadow ───────────────────────────────────────────────
  ctx.shadowColor = cfg.shadowColor
  ctx.shadowBlur  = cfg.shadowBlur

  // ── Ball body (radial gradient for 3-D sheen) ─────────────────
  const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.05, 0, 0, r)
  grad.addColorStop(0,   cfg.ballFill2)
  grad.addColorStop(0.55, cfg.ballFill)
  grad.addColorStop(1,   shadeHex(cfg.ballFill, -22))

  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // ── Reset shadow before seams (avoid doubled blur) ────────────
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur  = 0

  // ── Felt seams (two orthogonal S-curves) ──────────────────────
  ctx.save()
  ctx.rotate(angle)
  ctx.strokeStyle = cfg.lineColor
  ctx.lineWidth   = r * 0.072
  ctx.lineCap     = 'round'

  // Clip seams inside the circle
  ctx.beginPath()
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2)
  ctx.clip()

  // Seam 1 — horizontal S-curve
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.bezierCurveTo(-r * 0.4, -r * 0.55, r * 0.4, r * 0.55, r, 0)
  ctx.stroke()

  // Seam 2 — vertical S-curve (rotated 90°)
  ctx.save()
  ctx.rotate(Math.PI / 2)
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.bezierCurveTo(-r * 0.4, -r * 0.55, r * 0.4, r * 0.55, r, 0)
  ctx.stroke()
  ctx.restore()

  ctx.restore() // undo seam clip + rotation

  // ── Specular highlight ────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()

  ctx.restore()
}

/** Darken/lighten a hex colour by `amount` (negative = darker). */
function shadeHex(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

/* ─── React component ────────────────────────────────────────────── */

export default function TennisBallBackground({ className = '' }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({
    balls:   [],
    reduced: false,
    theme:   'light',
    frame:   0,
  })

  /** Detect current theme from <html data-theme="…"> */
  const getTheme = useCallback(() => {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }, [])

  /** Resize canvas to fill its CSS box */
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = width  * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    // Re-position balls that flew off-screen after resize
    const state = stateRef.current
    state.balls.forEach((b) => {
      b.x = Math.min(Math.max(b.x, b.r), width  - b.r)
      b.y = Math.min(Math.max(b.y, b.r), height - b.r)
    })
  }, [])

  /** Main animation loop */
  const animate = useCallback((_, deltaTime = 1000 / 60) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state  = stateRef.current
    const ctx    = canvas.getContext('2d')
    const W      = canvas.getBoundingClientRect().width
    const H      = canvas.getBoundingClientRect().height
    const cfg    = THEME[state.theme]
    const frameScale = Math.min(Math.max(deltaTime / (1000 / 60), 0), 3)

    ctx.clearRect(0, 0, W, H)
    ctx.globalAlpha = cfg.opacity

    state.balls.forEach((b) => {
      if (!state.reduced) {
        // Physics update
        b.x     += b.vx * frameScale
        b.y     += (b.vy + Math.sin(state.frame * b.bobSpeed + b.phase) * b.bobAmp * 0.012) * frameScale
        b.angle += b.spin * frameScale

        // Wall bounce
        if (b.x - b.r < 0)  { b.x = b.r;      b.vx =  Math.abs(b.vx) }
        if (b.x + b.r > W)  { b.x = W - b.r;  b.vx = -Math.abs(b.vx) }
        if (b.y - b.r < 0)  { b.y = b.r;      b.vy =  Math.abs(b.vy) }
        if (b.y + b.r > H)  { b.y = H - b.r;  b.vy = -Math.abs(b.vy) }
      }
      drawBall(ctx, b, cfg)
    })

    ctx.globalAlpha = 1
    state.frame += frameScale
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = stateRef.current

    // Detect reduced-motion preference
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    state.reduced = mql.matches
    const onMql = (e) => {
      state.reduced = e.matches
      gsap.ticker.remove(animate)
      if (state.reduced) animate(0, 0)
      else gsap.ticker.add(animate)
    }
    mql.addEventListener('change', onMql)

    // Initial setup
    state.theme = getTheme()
    resize()

    const { width, height } = canvas.getBoundingClientRect()
    state.balls = Array.from({ length: BALL_COUNT }, () => createBall(width, height))

    // Watch theme changes on <html>
    const observer = new MutationObserver(() => {
      state.theme = getTheme()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // Resize observer
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Use the app's shared GSAP ticker so the canvas does not create a second RAF loop.
    animate(0, 0)
    if (!state.reduced) gsap.ticker.add(animate)

    return () => {
      gsap.ticker.remove(animate)
      observer.disconnect()
      ro.disconnect()
      mql.removeEventListener('change', onMql)
    }
  }, [animate, getTheme, resize])

  return (
    <canvas
      ref={canvasRef}
      className={`tennis-ball-bg ${className}`}
      aria-hidden="true"
    />
  )
}
