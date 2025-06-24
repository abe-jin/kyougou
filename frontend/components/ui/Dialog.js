import React, { useEffect, useRef } from 'react'

export default function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const first = ref.current?.querySelector('input,button,select,textarea,[tabindex="0"]')
    first?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-card w-full max-w-md sm:w-96 max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
        ref={ref}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 id="dialog-title" className="text-lg font-semibold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-xl leading-none"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}