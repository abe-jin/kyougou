import { useEffect, useState, useContext } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LangContext } from '../i18n'
// 追加：NextAuthのsignIn, signOut, useSession
import { signIn, signOut, useSession } from "next-auth/react"

export default function Home() {
  const [data, setData] = useState({})
  const { lang, setLang, t } = useContext(LangContext)
  const [tz, setTz] = useState('UTC')
  const defaultPrefs = { showLatest: true, showLowest: true, showChart: true }
  const [prefs, setPrefs] = useState(defaultPrefs)
  // NextAuthのセッション
  const { data: session, status } = useSession()

  useEffect(() => {
    // NextAuth認証時はlocalStorage token不要
    fetch('/prices.json')
      .then((res) => res.json())
      .then((json) => setData(json))
  }, [])

  const updatePrefs = (newPrefs) => {
    setPrefs(newPrefs)
    // prefsの保存ロジックは用途に応じて修正
  }

  return (
    <Layout>
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
            <button onClick={() => signOut()} style={{ marginLeft: 16 }}>
              ログアウト
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("google")}>
            Googleでログイン
          </button>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={prefs.showLatest}
            onChange={(e) => updatePrefs({ ...prefs, showLatest: e.target.checked })}
          />
          {t('showLatest')}
        </label>{' '}
        <label>
          <input
            type="checkbox"
            checked={prefs.showLowest}
            onChange={(e) => updatePrefs({ ...prefs, showLowest: e.target.checked })}
          />
          {t('showLowest')}
        </label>{' '}
        <label>
          <input
            type="checkbox"
            checked={prefs.showChart}
            onChange={(e) => updatePrefs({ ...prefs, showChart: e.target.checked })}
          />
          {t('showChart')}
        </label>
      </div>
      <h1>{t('dashboardTitle')}</h1>
      <table>
        <thead>
          <tr>
            <th>{t('product')}</th>
            {prefs.showLatest && <th>{t('latestPrice')}</th>}
            {prefs.showLowest && <th>{t('lowestPrice')}</th>}
            <th>{t('reviews')}</th>
            <th>{t('rating')}</th>
            <th>{t('rank')}</th>
            <th>{t('trend')}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([name, history]) => {
            const adjusted = history.map((h) => ({
              ...h,
              time: new Date(h.time).toLocaleString('ja-JP', { timeZone: tz })
            }))
            const latestEntry = adjusted[adjusted.length - 1]
            const latest = latestEntry.price
            const minPrice = Math.min(...adjusted.map((h) => h.price))
            const rev = latestEntry.reviews ?? ''
            const rating = latestEntry.rating ?? ''
            const rank = latestEntry.rank ?? ''
            const trend = latestEntry.trend ?? ''
            return (
              <tr key={name}>
                <td>{name}</td>
                {prefs.showLatest && <td>{latest}</td>}
                {prefs.showLowest && <td>{minPrice}</td>}
                <td>{rev}</td>
                <td>{rating}</td>
                <td>{rank}</td>
                <td>{trend}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {prefs.showChart && Object.entries(data).map(([name, history]) => {
        const adjusted = history.map((h) => ({
          ...h,
          time: new Date(h.time).toLocaleString('ja-JP', { timeZone: tz })
        }))
        return (
        <div key={name}>
          <h3>{name}</h3>
          <div className="chart-container">
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
        </div>
        )})}
    </Layout>
  )
}
