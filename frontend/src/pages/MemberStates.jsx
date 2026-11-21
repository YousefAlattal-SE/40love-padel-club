import { useLayoutEffect, useRef } from 'react'

export function MemberLoading({ label }) {
  return <div className="member-loading" role="status">
    <span>{label}</span><div aria-hidden="true"><i /><i /><i /></div>
  </div>
}

export function MemberDialog({ label, onClose, busy = false, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog className="member-dialog" ref={ref} data-lenis-prevent aria-label={label}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    {children}
  </dialog>
}
