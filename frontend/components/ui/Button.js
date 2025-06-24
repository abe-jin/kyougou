import { useEffect } from 'react'

const colorMap = {
  primary: 'bg-primary hover:brightness-110',
  add: 'bg-green-600 hover:bg-green-700',
  edit: 'bg-blue-600 hover:bg-blue-700',
  delete: 'bg-red-600 hover:bg-red-700'
}

export default function Button({ className = '', variant = 'primary', children, ...props }) {
  const { type = 'button', 'aria-label': ariaLabel } = props
  useEffect(() => {
    if (!ariaLabel && typeof children === 'object') {
      console.warn('Button with icon requires aria-label')
    }
  }, [ariaLabel, children])
  const base = 'btn flex items-center gap-2 transition-shadow shadow-sm'
  const variantClass = colorMap[variant] || colorMap.primary
  return (
    <button type={type} className={`${base} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  )
}
