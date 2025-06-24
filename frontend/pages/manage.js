import React, { useEffect, useState, useContext } from 'react'
import Head from 'next/head'
import { LangContext } from '../i18n'
import Layout from '../components/Layout'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import Spinner from '../components/Spinner'
import DataTable from '../components/table/DataTable'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'
import Dialog from '../components/ui/Dialog'
import {
  PlusCircle,
  Save as SaveIcon,
  Trash2,
  Beaker,
  Play,
  Pause as PauseIcon,
  Search
} from 'lucide-react'
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch (e) {
    return null
  }
}

export default function Manage() {
  const { data: session, status } = useSession()
  const [products, setProducts] = useState([])
  const { lang, setLang, t } = useContext(LangContext)
  const [user, setUser] = useState(null)
  const [newProduct, setNewProduct] = useState({
    name: '',
    url: '',
    nameSelector: '',
    priceSelector: '',
    reviewSelector: '',
    ratingSelector: '',
    rankSelector: '',
    trendSelector: '',
    interval: 1,
    dropPercent: 0,
    belowPrice: 0,
    category: '',
    notify: 'slack',
    owner: '',
    paused: false
  })
  const [newTest, setNewTest] = useState(null)
  const [testResults, setTestResults] = useState({})
  const [reports, setReports] = useState([])
  const [approvals, setApprovals] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [commentInputs, setCommentInputs] = useState({})
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selected, setSelected] = useState([])
  const [users, setUsers] = useState([])
  const [origProducts, setOrigProducts] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [touched, setTouched] = useState({})
  const [bulkEdit, setBulkEdit] = useState({
    notify: '',
    interval: '',
    dropPercent: '',
    belowPrice: '',
    nameSelector: '',
    priceSelector: '',
    owner: ''
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const ITEMS_PER_PAGE = 10
  const [errors, setErrors] = useState({})
  const [undo, setUndo] = useState(null)
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      signIn('google')
      return
    }
    const token = localStorage.getItem('token')
    const payload = token ? decodeToken(token) : { email: session.user?.email }
    setUser(payload)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    setLoading(true)
    Promise.all([
      fetch('/api/products', { headers })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token')
            signIn('google')
            return Promise.reject()
          }
          return res.json()
        })
        .then((data) => {
          setProducts(data)
          setOrigProducts(data)
        }),
      fetch('/api/reports', { headers })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token')
            signIn('google')
            return Promise.reject()
          }
          return res.json()
        })
        .then((data) => setReports(data)),
      fetch('/api/approvals', { headers })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token')
            signIn('google')
            return Promise.reject()
          }
          return res.json()
        })
        .then((data) => setApprovals(data)),
      fetch('/api/suggestions', { headers })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token')
            signIn('google')
            return Promise.reject()
          }
          return res.json()
        })
        .then((data) => setSuggestions(data)),
      fetch('/api/templates', { headers })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token')
            signIn('google')
            return Promise.reject()
          }
          return res.json()
        })
        .then((data) => setTemplates(data)),
      fetch('/api/users', { headers })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token')
            signIn('google')
            return Promise.reject()
          }
          return res.json()
        })
        .then((data) => setUsers(data))
    ]).finally(() => setLoading(false))
  }, [session, status])

  useEffect(() => {
    if (user) {
    setNewProduct((p) => ({ ...p, owner: user.email }))
    }
  }, [user])

  const addProduct = async () => {
    if (!window.confirm('Add this product?')) return
    const errs = {}
    if (!newProduct.name) errs.name = true
    if (!newProduct.url) errs.url = true
    setErrors(errs)
    if (Object.keys(errs).length) {
      toast.error('Please fill required fields')
      return
    }
    const token = localStorage.getItem('token')
    setActionLoading(true)
    const prev = [...products]
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newProduct)
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      signIn('google')
      setActionLoading(false)
      return
    }
    const data = await res.json()
    setProducts(data)
    setOrigProducts(data)
    setOrigProducts(data)
    setUndo({ type: 'add', prev })
    toast.success(
      <span>
        Added <button className="underline" onClick={() => { undoLast(); toast.dismiss(t.id) }}>Undo</button>
      </span>
    )
    setNewProduct({
      name: '',
      url: '',
      nameSelector: '',
      priceSelector: '',
      reviewSelector: '',
      ratingSelector: '',
      rankSelector: '',
      trendSelector: '',
      interval: 1,
      dropPercent: 0,
      belowPrice: 0,
      category: '',
      notify: 'slack',
      owner: user?.email || '',
      paused: false
    })
    setActionLoading(false)
  }

  const updateProduct = async (index) => {
    if (!window.confirm('Save changes?')) return
    const token = localStorage.getItem('token')
    setActionLoading(true)
    const prev = [...products]
    const res = await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ index, product: products[index] })
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      signIn('google')
      setActionLoading(false)
      return
    }
    const data = await res.json()
    setProducts(data)
    setUndo({ type: 'edit', prev })
    toast.success(
      <span>
        Saved <button className="underline" onClick={() => { undoLast(); toast.dismiss(t.id) }}>Undo</button>
      </span>
    )
    setActionLoading(false)
    return data
  }

  const deleteProduct = async (index) => {
    if (!window.confirm('Delete this product?')) return
    const token = localStorage.getItem('token')
    setActionLoading(true)
    const prev = [...products]
    const res = await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ index })
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      signIn('google')
      setActionLoading(false)
      return
    }
    const data = await res.json()
    setProducts(data)
    toast.success('Deleted')
    setUndo({ type: 'delete', prev })
    toast.success(
      <span>
        Deleted <button className="underline" onClick={() => { undoLast(); toast.dismiss(t.id) }}>Undo</button>
      </span>
    )
    setActionLoading(false)
  }

  const rollback = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/rollback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      signIn('google')
      return
    }
    const data = await res.json()
    setProducts(data)
    setOrigProducts(data)
    toast.success('Rolled back')
  }

  const handleChange = (index, field, value) => {
    const updated = products.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    setProducts(updated)
  }
  const cancelEdit = (index) => {
    setProducts(products.map((p, i) => (i === index ? origProducts[index] : p)))
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const [pricesInput, setPricesInput] = useState('')
  const [margin, setMargin] = useState(1)
  const [simResult, setSimResult] = useState(null)
  const [reportPeriod, setReportPeriod] = useState('month')
  const [reportCategory, setReportCategory] = useState('')

  const simulatePrice = () => {
    const values = pricesInput
      .split(',')
      .map((v) => parseFloat(v))
      .filter((n) => !isNaN(n))
    if (values.length === 0) {
      setSimResult(null)
      return
    }
    const min = Math.min(...values)
    const price = Math.max(1, Math.floor(min * (1 - margin / 100)))
    setSimResult({ min, price })
  }

  const runTest = async (prod, idx) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        url: prod.url,
        nameSelector: prod.nameSelector,
        priceSelector: prod.priceSelector
      })
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      signIn('google')
      return
    }
    const data = await res.json()
    if (idx === null) {
      setNewTest(data)
    } else {
      setTestResults((r) => ({ ...r, [idx]: data }))
    }
  }

  const togglePause = async (index) => {
    const updated = products[index]
    updated.paused = !updated.paused
    setProducts([...products])
    await updateProduct(index)
  }

  const runNow = async (index) => {
    const token = localStorage.getItem('token')
    await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ index })
    })
  }
  const undoLast = () => {
    if (!undo) return
    setProducts(undo.prev)
    setUndo(null)
  }

  const applyBulkEdit = async () => {
    const indices = selected
    const updated = products.map((p, i) => {
      if (!indices.includes(i)) return p
      const np = { ...p }
      if (bulkEdit.notify) np.notify = bulkEdit.notify
      if (bulkEdit.interval) np.interval = Number(bulkEdit.interval)
      if (bulkEdit.dropPercent) np.dropPercent = Number(bulkEdit.dropPercent)
      if (bulkEdit.belowPrice) np.belowPrice = Number(bulkEdit.belowPrice)
      if (bulkEdit.nameSelector) np.nameSelector = bulkEdit.nameSelector
      if (bulkEdit.priceSelector) np.priceSelector = bulkEdit.priceSelector
      if (bulkEdit.owner) np.owner = bulkEdit.owner
      return np
    })
    setProducts(updated)
    for (const i of indices) {
      await updateProduct(i)
    }
  }

  const applyTemplate = async () => {
    const tpl = templates.find(t => t.name === selectedTemplate)
    if (!tpl) return
    const indices = selected
    const updated = products.map((p, i) => indices.includes(i) ? { ...p, ...tpl } : p)
    setProducts(updated)
    for (const i of indices) {
      await updateProduct(i)
    }
  }

  const fixSelectors = async (index, sugIndex) => {
    await updateProduct(index)
    await runNow(index)
    if (sugIndex !== undefined) {
      const token = localStorage.getItem('token')
      await fetch('/api/suggestions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ index: sugIndex })
      })
      const res = await fetch('/api/suggestions', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
      }
    }
  }

  const generateReport = async () => {
    const token = localStorage.getItem('token')
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ period: reportPeriod, category: reportCategory })
    })
    const res = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setReports(data)
    }
  }

  const addComment = async (id) => {
    const token = localStorage.getItem('token')
    const text = commentInputs[id] || ''
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, comment: text })
    })
    const data = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    setReports(data)
    setCommentInputs((c) => ({ ...c, [id]: '' }))
  }

  const approveReport = async (id) => {
    const token = localStorage.getItem('token')
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, approve: true })
    })
    const data = await fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    setReports(data)
  }

  const approvePrice = async (id) => {
    const token = localStorage.getItem('token')
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    })
    const data = await fetch('/api/approvals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    setApprovals(data)
  }

  const suggestionMap = {}
  suggestions.forEach((s, i) => {
    suggestionMap[s.url] = { ...s, idx: i }
  })
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.url.toLowerCase().includes(search.toLowerCase())
  )
  const sorted = filtered.sort((a, b) => {
    if (!sortField) return 0
    const av = a[sortField] || ''
    const bv = b[sortField] || ''
    if (av === bv) return 0
    if (sortOrder === 'asc') return av > bv ? 1 : -1
    return av < bv ? 1 : -1
  })

  const columns = [
    {
      header: t('select'),
      accessor: 'select',
      cell: (_, __, idx) => (
        <input
          type="checkbox"
          checked={selected.includes(idx)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelected([...selected, idx])
            } else {
              setSelected(selected.filter((i) => i !== idx))
            }
          }}
        />
      )
    },
    {
      header: t('name'),
      accessor: 'name',
      cell: (v, row, idx) => (
        <input value={v} onChange={(e) => handleChange(idx, 'name', e.target.value)} />
      )
    },
    { header: t('url'), accessor: 'url', cell: (v, row, idx) => (
        <input value={v} onChange={(e) => handleChange(idx, 'url', e.target.value)} />
    )},
    { header: t('nameSelector'), accessor: 'nameSelector', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'nameSelector', e.target.value)} />
    )},
    { header: t('priceSelector'), accessor: 'priceSelector', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'priceSelector', e.target.value)} />
    )},
    { header: t('reviewSelector'), accessor: 'reviewSelector', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'reviewSelector', e.target.value)} />
    )},
    { header: t('ratingSelector'), accessor: 'ratingSelector', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'ratingSelector', e.target.value)} />
    )},
    { header: t('rankSelector'), accessor: 'rankSelector', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'rankSelector', e.target.value)} />
    )},
    { header: t('trendSelector'), accessor: 'trendSelector', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'trendSelector', e.target.value)} />
    )},
    { header: t('interval'), accessor: 'interval', cell: (v, row, idx) => (
        <input type="number" value={v} onChange={(e) => handleChange(idx, 'interval', Number(e.target.value))} />
    )},
    { header: t('dropPercent'), accessor: 'dropPercent', cell: (v, row, idx) => (
        <input type="number" value={v || 0} onChange={(e) => handleChange(idx, 'dropPercent', Number(e.target.value))} />
    )},
    { header: t('belowPrice'), accessor: 'belowPrice', cell: (v, row, idx) => (
        <input type="number" value={v || 0} onChange={(e) => handleChange(idx, 'belowPrice', Number(e.target.value))} />
    )},
    { header: t('category'), accessor: 'category', cell: (v, row, idx) => (
        <input value={v || ''} onChange={(e) => handleChange(idx, 'category', e.target.value)} />
    )},
    { header: t('notify'), accessor: 'notify', cell: (v, row, idx) => (
        <select value={v || 'slack'} onChange={(e) => handleChange(idx, 'notify', e.target.value)}>
          <option value="slack">Slack</option>
          <option value="line">LINE</option>
          <option value="webhook">Webhook</option>
          <option value="teams">Teams</option>
          <option value="sms">SMS</option>
          <option value="chat">Google Chat</option>
          <option value="both">Slack+LINE</option>
        </select>
    )},
    { header: t('owner'), accessor: 'owner', cell: (v, row, idx) => (
        user?.role === 'admin' ? (
          <select value={v || ''} onChange={(e) => handleChange(idx, 'owner', e.target.value)}>
            {users.map((u) => (
              <option key={u.email} value={u.email}>{u.email}</option>
            ))}
          </select>
        ) : (v || '')
    )},
    { header: t('paused'), accessor: 'paused', cell: (v) => (
        v ? <span className="status-badge status-paused">{t('paused')}</span> : ''
    )},
    { header: t('actions'), accessor: 'actions', cell: (_, row, idx) => (
        (user?.role === 'admin' || row.owner === user?.email) && (
          <div className="row-actions gap-1">
            <Button disabled={actionLoading} onClick={() => updateProduct(idx)} variant="edit" aria-label="Save row">
              <SaveIcon size={14} /> {actionLoading ? '...' : t('save')}
            </Button>
            <Button onClick={() => cancelEdit(idx)} variant="edit" aria-label="Cancel edit">
              {t('cancel')}
            </Button>
            <Button disabled={actionLoading} onClick={() => deleteProduct(idx)} variant="delete" aria-label="Delete row">
              <Trash2 size={14} /> {actionLoading ? '...' : t('delete')}
            </Button>
            <Button onClick={() => runTest(row, idx)} variant="edit" aria-label="Test selectors">
              <Beaker size={14} /> {t('test')}
            </Button>
            <Button onClick={() => runNow(idx)} variant="edit" aria-label="Run now">
              <Play size={14} /> {t('run')}
            </Button>
            <Button onClick={() => togglePause(idx)} variant="edit" aria-label={row.paused ? 'Resume' : 'Pause'}>
              {row.paused ? <Play size={14} /> : <PauseIcon size={14} />} {row.paused ? t('resume') : t('pause')}
            </Button>
            {testResults[idx] && (
              <span>
                {t('result')}: {testResults[idx].name} {testResults[idx].price ?? ''}
              </span>
            )}
          </div>
        )
    )}
  ]
  return (
    <Layout>
      {(loading || actionLoading) && <Spinner overlay />}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t('manageTitle')}</title>
      </Head>
      <div style={{ textAlign: 'right' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>{' '}
        <a href="/help">{t('help')}</a>
      </div>
      <h1>{t('manageTitle')}</h1>
      <Button onClick={() => setShowAdd(true)} variant="add" aria-label="Add product">
        <PlusCircle size={16} /> {t('addProduct')}
      </Button>
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={t('addProduct')}>
        <FormField
          label={t('name')}
          placeholder={t('name')}
          value={newProduct.name}
          onChange={(e) => { setNewProduct({ ...newProduct, name: e.target.value }); setTouched({ ...touched, name: true }) }}
          required
          error={touched.name && !newProduct.name ? t('requiredField') : ''}
        />
        <FormField
          label={t('url')}
          placeholder="https://example.com/item"
          value={newProduct.url}
          onChange={(e) => { setNewProduct({ ...newProduct, url: e.target.value }); setTouched({ ...touched, url: true }) }}
          required
          error={touched.url && !newProduct.url ? t('requiredField') : ''}
        />
        <FormField label={t('nameSelector')} value={newProduct.nameSelector} onChange={(e) => setNewProduct({ ...newProduct, nameSelector: e.target.value })} />
        <FormField label={t('priceSelector')} value={newProduct.priceSelector} onChange={(e) => setNewProduct({ ...newProduct, priceSelector: e.target.value })} />
        <FormField label={t('reviewSelector')} value={newProduct.reviewSelector} onChange={(e) => setNewProduct({ ...newProduct, reviewSelector: e.target.value })} />
        <FormField label={t('ratingSelector')} value={newProduct.ratingSelector} onChange={(e) => setNewProduct({ ...newProduct, ratingSelector: e.target.value })} />
        <FormField label={t('rankSelector')} value={newProduct.rankSelector} onChange={(e) => setNewProduct({ ...newProduct, rankSelector: e.target.value })} />
        <FormField label={t('trendSelector')} value={newProduct.trendSelector} onChange={(e) => setNewProduct({ ...newProduct, trendSelector: e.target.value })} />
        <FormField type="number" label={t('interval')} value={newProduct.interval} onChange={(e) => setNewProduct({ ...newProduct, interval: Number(e.target.value) })} />
        <FormField type="number" label={t('dropPercent')} value={newProduct.dropPercent} onChange={(e) => setNewProduct({ ...newProduct, dropPercent: Number(e.target.value) })} />
        <FormField type="number" label={t('belowPrice')} value={newProduct.belowPrice} onChange={(e) => setNewProduct({ ...newProduct, belowPrice: Number(e.target.value) })} />
        <FormField label={t('category')} value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">{t('notify')}</label>
          <select className="border px-2 py-1 rounded w-full" value={newProduct.notify} onChange={(e) => setNewProduct({ ...newProduct, notify: e.target.value })}>
            <option value="slack">Slack</option>
            <option value="line">LINE</option>
            <option value="webhook">Webhook</option>
            <option value="teams">Teams</option>
            <option value="sms">SMS</option>
            <option value="chat">Google Chat</option>
            <option value="both">Slack+LINE</option>
          </select>
        </div>
        {user?.role === 'admin' && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">{t('owner')}</label>
            <select className="border px-2 py-1 rounded w-full" value={newProduct.owner} onChange={(e) => setNewProduct({ ...newProduct, owner: e.target.value })}>
              {users.map(u => (
                <option key={u.email} value={u.email}>{u.email}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <Button onClick={async () => {
            if (!newProduct.url) return
            const res = await fetch('/api/detect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: newProduct.url })
            })
            if (res.ok) {
              const json = await res.json()
              setNewProduct(p => ({ ...p, nameSelector: json.nameSelector, priceSelector: json.priceSelector }))
            }
          }} variant="edit" aria-label="Auto detect selectors">
            <Search size={16} /> {t('autoDetect')}
          </Button>
          <Button onClick={() => runTest(newProduct, null)} variant="edit" aria-label="Test selectors">
            <Beaker size={16} /> {t('test')}
          </Button>
        </div>
        {newTest && (
          <p className="text-sm">{t('result')}: {newTest.name} {newTest.price ?? ''}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => { setNewProduct({
            name: '', url: '', nameSelector: '', priceSelector: '', reviewSelector: '', ratingSelector: '', rankSelector: '', trendSelector: '', interval: 1, dropPercent: 0, belowPrice: 0, category: '', notify: 'slack', owner: user?.email || '', paused: false }); setTouched({}) }} variant="edit">
            {t('clear')}
          </Button>
          <Button onClick={() => setShowAdd(false)} variant="delete" aria-label="Cancel add">
            {t('cancel')}
          </Button>
          <Button onClick={addProduct} disabled={actionLoading} variant="add" aria-label="Save new product">
            <PlusCircle size={16} /> {actionLoading ? '...' : t('save')}
          </Button>
        </div>
      </Dialog>
      {user?.role === 'admin' && (
        <Button onClick={rollback} variant="delete" aria-label="Rollback changes">
          <Trash2 size={16} /> {t('rollback')}
        </Button>
)}
      <h2>{t('generateReport')}</h2>
      <div>
        <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
          <option value="month">{t('monthly')}</option>
          <option value="year">{t('yearly')}</option>
          <option value="category">{t('categoryReport')}</option>
        </select>
        {reportPeriod === 'category' && (
          <input placeholder={t('category')} value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} />
        )}
        <Button onClick={generateReport} variant="edit">
          <SaveIcon size={16} /> {t('generate')}
        </Button>
      </div>

      <h2>{t('priceSimulation')}</h2>
      <div>
        <input
          placeholder="competitor prices e.g. 1000,980,1050"
          value={pricesInput}
          onChange={(e) => setPricesInput(e.target.value)}
        />
        <input
          type="number"
          step="0.1"
          placeholder="margin %"
          value={margin}
          onChange={(e) => setMargin(parseFloat(e.target.value))}
        />
        <Button onClick={simulatePrice} variant="edit">
          <Play size={16} /> {t('simulate')}
        </Button>
        {simResult && (
          <div>
            <p>{t('minCompetitorPrice')}: {simResult.min}</p>
            <p>{t('suggestedPrice')}: {simResult.price}</p>
          </div>
        )}
      </div>
      <h2>{t('bulkEdit')}</h2>
      <div>
        <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
          <option value="">{t('chooseTemplate')}</option>
          {templates.map((tpl, i) => (
            <option key={i} value={tpl.name}>{tpl.name}</option>
          ))}
        </select>
        <Button onClick={applyTemplate} variant="edit">
          <SaveIcon size={16} /> {t('applyTemplate')}
        </Button>
        <div>
          <input placeholder={t('notify')} value={bulkEdit.notify} onChange={(e) => setBulkEdit({ ...bulkEdit, notify: e.target.value })} />
          <input type="number" placeholder={t('interval')} value={bulkEdit.interval} onChange={(e) => setBulkEdit({ ...bulkEdit, interval: e.target.value })} />
          <input type="number" placeholder={t('dropPercent')} value={bulkEdit.dropPercent} onChange={(e) => setBulkEdit({ ...bulkEdit, dropPercent: e.target.value })} />
          <input type="number" placeholder={t('belowPrice')} value={bulkEdit.belowPrice} onChange={(e) => setBulkEdit({ ...bulkEdit, belowPrice: e.target.value })} />
          <input placeholder={t('nameSelector')} value={bulkEdit.nameSelector} onChange={(e) => setBulkEdit({ ...bulkEdit, nameSelector: e.target.value })} />
          <input placeholder={t('priceSelector')} value={bulkEdit.priceSelector} onChange={(e) => setBulkEdit({ ...bulkEdit, priceSelector: e.target.value })} />
          {user?.role === 'admin' && (
            <select value={bulkEdit.owner} onChange={(e) => setBulkEdit({ ...bulkEdit, owner: e.target.value })}>
              <option value="">{t('owner')}</option>
              {users.map(u => (
                <option key={u.email} value={u.email}>{u.email}</option>
              ))}
            </select>
          )}
          <Button onClick={applyBulkEdit} variant="edit">
            <SaveIcon size={16} /> {t('applyBulk')}
          </Button>
        </div>
      </div>
      <h2>{t('productsTitle')}</h2>
      <div className="my-2">
        <input
          className="border px-2 py-1"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
        />
      </div>
      {!loading && (
      <>
      <DataTable columns={columns} data={sorted} pageSize={ITEMS_PER_PAGE} />
      </>
      )}
      <h2>{t('pendingApprovals')}</h2>
      <table>
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('oldPrice')}</th>
            <th>{t('newPrice')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.oldPrice}</td>
              <td>{a.newPrice}</td>
              <td>
                {user?.role === 'admin' && (
                  <Button onClick={() => approvePrice(a.id)} variant="add">
                    <PlusCircle size={14} /> {t('approve')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t('selectorSuggestions')}</h2>
      <table>
        <thead>
          <tr>
            <th>{t('url')}</th>
            <th>{t('nameSelector')}</th>
            <th>{t('priceSelector')}</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((s, i) => (
            <tr key={i}>
              <td>{s.url}</td>
              <td>{s.nameSelector || ''}</td>
              <td>{s.priceSelector || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t('reports')}</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>{t('period')}</th>
            <th>{t('category')}</th>
            <th>{t('comment')}</th>
            <th>{t('approved')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.time).toLocaleString()}</td>
              <td>{r.period}</td>
              <td>{r.category}</td>
              <td>
                {r.comments.map((c, i) => (
                  <div key={i}>{c.user}: {c.text}</div>
                ))}
                <input
                  value={commentInputs[r.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [r.id]: e.target.value })}
                />
                <Button onClick={() => addComment(r.id)} variant="add">
                  <PlusCircle size={14} /> {t('addComment')}
                </Button>
              </td>
              <td>
                {r.approvals.map((a, i) => (
                  <div key={i}>{a.user}</div>
                ))}
              </td>
              <td>
                {user?.role === 'admin' && (
                  <Button onClick={() => approveReport(r.id)} variant="add">
                    <PlusCircle size={14} /> {t('approve')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  )
}