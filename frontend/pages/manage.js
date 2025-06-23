import React, { useEffect, useState, useContext } from 'react'
import Head from 'next/head'
import { LangContext } from '../i18n'
import Layout from '../components/Layout'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import Spinner from '../components/Spinner'
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
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 10
  const [errors, setErrors] = useState({})

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
        .then((data) => setProducts(data)),
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
    toast.success('Added')
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
    const token = localStorage.getItem('token')
    setActionLoading(true)
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
    toast.success('Saved')
    setActionLoading(false)
    return data
  }

  const deleteProduct = async (index) => {
    const token = localStorage.getItem('token')
    setActionLoading(true)
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
    toast.success('Rolled back')
  }

  const handleChange = (index, field, value) => {
    const updated = products.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    setProducts(updated)
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
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)
  const paged = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <Layout>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t('manageTitle')}</title>
      </Head>
      <div style={{ textAlign: 'right' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>{' '}
        <a href="/help">{t('help')}</a>
      </div>
      <h1>{t('manageTitle')}</h1>
      <h2>{t('addProduct')}</h2>
      <div>
        <input
          className={`border px-2 py-1 ${errors.name ? 'border-red-500' : ''}`}
          placeholder={t('name')}
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        />
        <input
          className={`border px-2 py-1 ${errors.url ? 'border-red-500' : ''}`}
          placeholder={t('url')}
          value={newProduct.url}
          onChange={(e) => setNewProduct({ ...newProduct, url: e.target.value })}
        />
        <input placeholder={t('nameSelector')} value={newProduct.nameSelector} onChange={(e) => setNewProduct({ ...newProduct, nameSelector: e.target.value })} />
        <input placeholder={t('priceSelector')} value={newProduct.priceSelector} onChange={(e) => setNewProduct({ ...newProduct, priceSelector: e.target.value })} />
        <input placeholder={t('reviewSelector')} value={newProduct.reviewSelector} onChange={(e) => setNewProduct({ ...newProduct, reviewSelector: e.target.value })} />
        <input placeholder={t('ratingSelector')} value={newProduct.ratingSelector} onChange={(e) => setNewProduct({ ...newProduct, ratingSelector: e.target.value })} />
        <input placeholder={t('rankSelector')} value={newProduct.rankSelector} onChange={(e) => setNewProduct({ ...newProduct, rankSelector: e.target.value })} />
        <input placeholder={t('trendSelector')} value={newProduct.trendSelector} onChange={(e) => setNewProduct({ ...newProduct, trendSelector: e.target.value })} />
        <button onClick={async () => {
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
        }}>{t('autoDetect')}</button>
        <button onClick={() => runTest(newProduct, null)}>{t('test')}</button>
        {newTest && (
          <span>{t('result')}: {newTest.name} {newTest.price ?? ''}</span>
        )}
        <input type="number" placeholder={t('interval')} value={newProduct.interval} onChange={(e) => setNewProduct({ ...newProduct, interval: Number(e.target.value) })} />
        <input type="number" placeholder={t('dropPercent')} value={newProduct.dropPercent} onChange={(e) => setNewProduct({ ...newProduct, dropPercent: Number(e.target.value) })} />
        <input type="number" placeholder={t('belowPrice')} value={newProduct.belowPrice} onChange={(e) => setNewProduct({ ...newProduct, belowPrice: Number(e.target.value) })} />
        <input placeholder={t('category')} value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
        <select value={newProduct.notify} onChange={(e) => setNewProduct({ ...newProduct, notify: e.target.value })}>
          <option value="slack">Slack</option>
          <option value="line">LINE</option>
          <option value="webhook">Webhook</option>
          <option value="teams">Teams</option>
          <option value="sms">SMS</option>
          <option value="chat">Google Chat</option>
          <option value="both">Slack+LINE</option>
        </select>
        {user?.role === 'admin' && (
          <select value={newProduct.owner} onChange={(e) => setNewProduct({ ...newProduct, owner: e.target.value })}>
            {users.map(u => (
              <option key={u.email} value={u.email}>{u.email}</option>
            ))}
          </select>
        )}
        <button onClick={addProduct} disabled={actionLoading} className="border px-2 py-1">
          {actionLoading ? '...' : t('addProduct')}
        </button>
      </div>
      {user?.role === 'admin' && (
        <button onClick={rollback}>{t('rollback')}</button>
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
        <button onClick={generateReport}>{t('generate')}</button>
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
        <button onClick={simulatePrice}>{t('simulate')}</button>
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
        <button onClick={applyTemplate}>{t('applyTemplate')}</button>
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
          <button onClick={applyBulkEdit}>{t('applyBulk')}</button>
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
            setPage(0)
          }}
        />
      </div>
      {loading ? (
        <Spinner />
      ) : (
      <>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>{t('select')}</th>
            <th onClick={() => handleSort('name')} className="cursor-pointer">
              {t('name')}
            </th>
            <th>{t('url')}</th>
            <th>{t('nameSelector')}</th>
            <th>{t('priceSelector')}</th>
            <th>{t('reviewSelector')}</th>
            <th>{t('ratingSelector')}</th>
            <th>{t('rankSelector')}</th>
            <th>{t('trendSelector')}</th>
            <th>{t('interval')}</th>
            <th>{t('dropPercent')}</th>
            <th>{t('belowPrice')}</th>
            <th>{t('category')}</th>
            <th>{t('notify')}</th>
            <th>{t('owner')}</th>
            <th>{t('paused')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((p, i) => (
            <React.Fragment key={i}>
              <tr>
                <td>
                  <input type="checkbox" checked={selected.includes(i)} onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, i])
                    } else {
                      setSelected(selected.filter(idx => idx !== i))
                    }
                  }} />
                </td>
                <td>
                  <input value={p.name} onChange={(e) => handleChange(i, 'name', e.target.value)} />
                </td>
                <td>
                  <input value={p.url} onChange={(e) => handleChange(i, 'url', e.target.value)} />
                </td>
                <td>
                  <input value={p.nameSelector || ''} onChange={(e) => handleChange(i, 'nameSelector', e.target.value)} />
                </td>
                <td>
                  <input value={p.priceSelector || ''} onChange={(e) => handleChange(i, 'priceSelector', e.target.value)} />
                </td>
                <td>
                  <input value={p.reviewSelector || ''} onChange={(e) => handleChange(i, 'reviewSelector', e.target.value)} />
                </td>
                <td>
                  <input value={p.ratingSelector || ''} onChange={(e) => handleChange(i, 'ratingSelector', e.target.value)} />
                </td>
                <td>
                  <input value={p.rankSelector || ''} onChange={(e) => handleChange(i, 'rankSelector', e.target.value)} />
                </td>
                <td>
                  <input value={p.trendSelector || ''} onChange={(e) => handleChange(i, 'trendSelector', e.target.value)} />
                </td>
                <td>
                  <input type="number" value={p.interval} onChange={(e) => handleChange(i, 'interval', Number(e.target.value))} />
                </td>
                <td>
                  <input type="number" value={p.dropPercent || 0} onChange={(e) => handleChange(i, 'dropPercent', Number(e.target.value))} />
                </td>
                <td>
                  <input type="number" value={p.belowPrice || 0} onChange={(e) => handleChange(i, 'belowPrice', Number(e.target.value))} />
                </td>
                <td>
                  <input value={p.category || ''} onChange={(e) => handleChange(i, 'category', e.target.value)} />
                </td>
                <td>
                  <select value={p.notify || 'slack'} onChange={(e) => handleChange(i, 'notify', e.target.value)}>
                    <option value="slack">Slack</option>
                    <option value="line">LINE</option>
                    <option value="webhook">Webhook</option>
                    <option value="teams">Teams</option>
                    <option value="sms">SMS</option>
                    <option value="chat">Google Chat</option>
                    <option value="both">Slack+LINE</option>
                  </select>
                </td>
                <td>
                  {user?.role === 'admin' ? (
                    <select value={p.owner || ''} onChange={(e) => handleChange(i, 'owner', e.target.value)}>
                      {users.map(u => (
                        <option key={u.email} value={u.email}>{u.email}</option>
                      ))}
                    </select>
                  ) : (
                    p.owner || ''
                  )}
                </td>
                <td>{p.paused ? t('paused') : ''}</td>
                <td>
                  {(user?.role === 'admin' || p.owner === user?.email) && (
                    <>
                      <button disabled={actionLoading} onClick={() => updateProduct(i)} className="border px-2 py-1">
                        {actionLoading ? '...' : t('save')}
                      </button>
                      <button disabled={actionLoading} onClick={() => deleteProduct(i)} className="border px-2 py-1">
                        {actionLoading ? '...' : t('delete')}
                      </button>
                      <button onClick={() => runTest(p, i)}>{t('test')}</button>
                      <button onClick={() => runNow(i)}>{t('run')}</button>
                      <button onClick={() => togglePause(i)}>
                        {p.paused ? t('resume') : t('pause')}
                      </button>
                      {testResults[i] && (
                        <span>
                          {t('result')}: {testResults[i].name}{' '}
                          {testResults[i].price ?? ''}
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
              {suggestionMap[p.url] && (
                <tr key={`fix-${i}`}>
                  <td colSpan="17">
                    <div>
                      <span>{t('fixSelectors')}:</span>{' '}
                      <input
                        placeholder={t('nameSelector')}
                        value={p.nameSelector || suggestionMap[p.url].nameSelector || ''}
                        onChange={(e) => handleChange(i, 'nameSelector', e.target.value)}
                      />
                      <input
                        placeholder={t('priceSelector')}
                        value={p.priceSelector || suggestionMap[p.url].priceSelector || ''}
                        onChange={(e) => handleChange(i, 'priceSelector', e.target.value)}
                      />
                      <button onClick={() => fixSelectors(i, suggestionMap[p.url].idx)}>
                        {t('saveAndRun')}
                      </button>
                      <button onClick={() => runNow(i)}>{t('retry')}</button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end gap-2 my-2">
        <button
          className="border px-2 py-1"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </button>
        <span>
          {page + 1}/{totalPages || 1}
        </span>
        <button
          className="border px-2 py-1"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          Next
        </button>
      </div>
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
                  <button onClick={() => approvePrice(a.id)}>{t('approve')}</button>
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
                <button onClick={() => addComment(r.id)}>{t('addComment')}</button>
              </td>
              <td>
                {r.approvals.map((a, i) => (
                  <div key={i}>{a.user}</div>
                ))}
              </td>
              <td>
                {user?.role === 'admin' && (
                  <button onClick={() => approveReport(r.id)}>{t('approve')}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  )
}