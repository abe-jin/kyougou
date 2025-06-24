export default function Spinner({ overlay = false }) {
  const content = (
    <div className="flex justify-center my-4" role="status" aria-live="polite">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
    </div>
  )
  return overlay ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" aria-busy="true">
      {content}
    </div>
  ) : (
    content
  )
}