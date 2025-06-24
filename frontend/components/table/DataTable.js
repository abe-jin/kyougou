import { useState, useContext } from 'react'
import { LangContext } from '../../i18n'

export default function DataTable({
  columns,
  data,
  pageSize = 10,
  page: controlledPage,
  total,
  onPageChange
}) {
  const { t } = useContext(LangContext)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPageState] = useState(controlledPage || 0)
  const setPage = (p) => {
    if (controlledPage !== undefined) {
      onPageChange && onPageChange(p)
    } else {
      setPageState(p)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortField) return 0
    if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1
    if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil((total ?? sorted.length) / pageSize)
  const paged = total ? data : sorted.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse" role="table" aria-label="Data table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor}
                className={`px-4 py-2 border-b cursor-pointer ${sortField === col.accessor ? 'font-bold' : ''}`}
                onClick={() => handleSort(col.accessor)}
                aria-sort={sortField === col.accessor ? sortOrder : 'none'}
              >
                {col.header}
                {sortField === col.accessor && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-2 text-center">
                {t('noData')}
              </td>
            </tr>
          )}
          {paged.map((row, i) => {
            const rowIndex = i + page * pageSize
            return (
              <tr
                key={i}
                className={`border-b ${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 group`}
                tabIndex="0"
                role="row"
              >
                {columns.map((col) => (
                  <td key={col.accessor} className="px-4 py-2">
                    {col.cell ? col.cell(row[col.accessor], row, rowIndex) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex justify-end gap-2 my-2">
        <button
          className="border px-2 py-1 rounded"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="Previous page"
        >
          {t('prev')}
        </button>
        <span>{page + 1}/{totalPages || 1}</span>
        <button
          className="border px-2 py-1 rounded"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          aria-label="Next page"
        >
          {t('next')}
        </button>
      </div>
    </div>
  )
}
