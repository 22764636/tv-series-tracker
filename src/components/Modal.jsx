import { useEffect, useRef } from 'react'
import CloseIcon from './CloseIcon'

export default function Modal({ title, onClose, children, wide = false }) {
  // Always call the latest onClose without re-running the mount effect below
  // on every render (onClose is often a fresh arrow function per render).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const pushedRef = useRef(false)

  // Every modal in the app shares this component, so fixing "Back closes the
  // modal instead of navigating away/exiting the app" here covers all of
  // them at once. Push one history entry when the modal opens; a Back press
  // fires popstate, which we treat as a close.
  //
  // `pushedRef` (not local closure state) guards the push so it survives
  // React StrictMode's dev-only double mount→cleanup→mount of this effect.
  // The old version called `history.back()` unconditionally from the
  // cleanup when the close wasn't from Back — but `history.back()` is
  // async (the resulting popstate fires on a later task), so under
  // StrictMode's synchronous phantom cleanup it fired *after* the second,
  // real mount had already re-subscribed its own popstate listener — that
  // listener then caught the phantom back-navigation and closed the modal
  // instantly, before it was ever visible. Fix: never call `history.back()`
  // from a cleanup. Instead, every non-Back close path (X, overlay click,
  // Escape) explicitly calls `closeViaHistory`, which pops our pushed entry
  // itself; the resulting popstate is the only thing that ever calls
  // onClose. Cleanup only ever removes the listener, so it has no side
  // effect to race.
  useEffect(() => {
    if (!pushedRef.current) {
      window.history.pushState({ modal: true }, '')
      pushedRef.current = true
    }

    function onPopState() {
      pushedRef.current = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  function closeViaHistory() {
    if (pushedRef.current) window.history.back()
    else onCloseRef.current()
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeViaHistory()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm sm:pt-24"
      onClick={closeViaHistory}
    >
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border border-border bg-surface p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button
            onClick={closeViaHistory}
            aria-label="Chiudi"
            className="rounded-full p-1.5 text-muted hover:bg-surface-hover hover:text-text"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
