import React, { useId } from 'react'

export default function FormField({
  label,
  description = '',
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  id,
  name
}) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-required={required}
        className={`border px-2 py-1 rounded w-full ${error ? 'border-red-500' : ''}`}
      />
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
