import { useLayoutEffect, useRef } from 'react'
import { gsap, SplitText as GsapSplitText } from './gsap'

export default function SplitText({ as: Tag = 'h1', className = '', children }) {
  const elementRef = useRef(null)

  useLayoutEffect(() => {
    const element = elementRef.current
    if (!element) return undefined

    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      let splitText
      const context = gsap.context(() => {
        splitText = GsapSplitText.create(element, {
          type: 'words',
          tag: 'span',
          wordsClass: 'split-text-word',
          mask: 'words',
          aria: 'auto',
          autoSplit: true,
          onSplit: (split) => gsap.from(split.words, {
            yPercent: 105,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.055,
            ease: 'power3.out',
          }),
        })
      }, element)

      return () => {
        splitText?.revert()
        context.revert()
      }
    })

    return () => motion.revert()
  }, [])

  return <Tag ref={elementRef} className={className}>{children}</Tag>
}
