import { useEffect, useState, useContext } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LangContext } from '../i18n'
import DataTable from '../components/table/DataTable'
import { DollarSign, Star, TrendingUp, PlusCircle, Trash2, CheckCircle, Tag, BarChart3 } from 'lucide-react'
import Button from '../components/ui/Button'
import Spinner from '../components/Spinner'
// 追加：NextAuthのsignIn, signOut, useSession
import { signIn, signOut, useSession } from "next-auth/react"

export default function Home() {
  const [data, setData] = useState({})
  const { lang, setLang, t } = useContext(LangContext)
  const [tz, setTz] = useState('UTC')
  const defaultPrefs = { showLatest: true, showLowest: true, showChart: true }
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [loading, setLoading] = useState(true)
  const handleSearch = (q) => console.log('search', q)
  // NextAuthのセッション
  const { data: session, status } = useSession()

  useEffect(() => {
    const stored = localStorage.getItem('prefs')
    if (stored) {
      try { setPrefs(JSON.parse(stored)) } catch(e) {}
    }
    fetch('/prices.json')
      .then((res) => res.json())
      .then((json) => { setData(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const updatePrefs = (newPrefs) => {
    setPrefs(newPrefs)
    localStorage.setItem('prefs', JSON.stringify(newPrefs))
  }

  return (
    <Layout onSearch={handleSearch}>
      {loading && <Spinner overlay />}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t('dashboardTitle')}</title>
      </Head>

      {/* Googleログインボタン */}
      <div style={{ margin: "1em 0", textAlign: "right" }}>
        {status === "loading" ? (
          <span>Loading...</span>
        ) : session ? (
          <div>
            <span>ログイン中: {session.user?.email}</span>
            <Button onClick={() => signOut()} variant="delete" style={{ marginLeft: 16 }} aria-label="Logout">
              <Trash2 size={16} /> ログアウト
            </Button>
          </div>
        ) : (
          <Button onClick={() => signIn("google")} variant="add" aria-label="Login with Google">
            <PlusCircle size={16} /> Googleでログイン
          </Button>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-card mb-4 flex flex-wrap gap-4" role="group" aria-label="Preferences">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.showLatest}
            onChange={(e) => updatePrefs({ ...prefs, showLatest: e.target.checked })}
          />
          <CheckCircle size={16}/> {t('showLatest')}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.showLowest}
            onChange={(e) => updatePrefs({ ...prefs, showLowest: e.target.checked })}
          />
          <Tag size={16}/> {t('showLowest')}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.showChart}
            onChange={(e) => updatePrefs({ ...prefs, showChart: e.target.checked })}
          />
          <BarChart3 size={16}/> {t('showChart')}
        </label>
      </div>
      <h1 className="section-title">{t('dashboardTitle')}</h1>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-card mb-6">
      <DataTable
        columns={[
          { header: t('product'), accessor: 'name' },
          ...(prefs.showLatest ? [{
            header: t('latestPrice'),
            accessor: 'latest',
            cell: (v) => (
              <span className="flex items-center gap-1 text-right">
                <DollarSign size={14} /> {v}
              </span>
            )
          }] : []),
          ...(prefs.showLowest ? [{
            header: t('lowestPrice'),
            accessor: 'minPrice'
          }] : []),
          { header: t('reviews'), accessor: 'reviews' },
          { header: t('rating'), accessor: 'rating', cell: (v) => (
            <span className="flex items-center gap-1">
              <Star size={14} /> {v}
            </span>
          ) },
          { header: t('rank'), accessor: 'rank' },
          { header: t('trend'), accessor: 'trend', cell: (v) => (
            <span className="flex items-center gap-1">
              <TrendingUp size={14} /> {v}
            </span>
          ) }
        ]}
        data={Object.entries(data).map(([name, history]) => {
          const adjusted = history.map((h) => ({
            ...h,
            time: new Date(h.time).toLocaleString('ja-JP', { timeZone: tz })
          }))
          const latestEntry = adjusted[adjusted.length - 1]
          return {
            name,
            latest: latestEntry.price,
            minPrice: Math.min(...adjusted.map((h) => h.price)),
            reviews: latestEntry.reviews ?? '',
            rating: latestEntry.rating ?? '',
            rank: latestEntry.rank ?? '',
            trend: latestEntry.trend ?? ''
          }
        })}
        aria-label="Product table"
      />
      </div>

      {prefs.showChart && Object.entries(data).map(([name, history]) => {
        const adjusted = history.map((h) => ({
          ...h,
          time: new Date(h.time).toLocaleString('ja-JP', { timeZone: tz })
        }))
        return (
        <details key={name} className="bg-white dark:bg-gray-800 p-4 rounded shadow-card mb-4" open>
          <summary className="cursor-pointer font-semibold mb-2">{name}</summary>
          <div className="chart-container" role="img" aria-label={`${name} chart`}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adjusted}>
                <XAxis dataKey="time" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </details>
        )})}
    </Layout>
  )
}
