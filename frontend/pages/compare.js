import { useEffect, useState, useContext } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { LangContext } from '../i18n'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c']

export default function Compare() {
  const [data, setData] = useState({})
  const { lang, setLang, t } = useContext(LangContext)
  useEffect(() => {
    fetch('/prices.json')
      .then((res) => res.json())
      .then((json) => setData(json))
  }, [])

  const entries = Object.entries(data)
  const latestPrices = entries.map(([name, history]) => {
    const latest = history[history.length - 1]?.price || 0
    return { name, price: latest }
  })
  const total = latestPrices.reduce((sum, p) => sum + p.price, 0)
  const minPrice = Math.min(...latestPrices.map((p) => p.price)) || 0
  const shareData = latestPrices.map((p) => ({ name: p.name, value: p.price }))
  const diffData = latestPrices.map((p) => ({ name: p.name, diff: p.price - minPrice }))

  return (
    <Layout>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t('compareTitle')}</title>
      </Head>
      <div style={{ textAlign: 'right' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
      <h1>{t('compareTitle')}</h1>
      <table>
        <thead>
          <tr>
            <th>{t('product')}</th>
            <th>{t('latestPrice')}</th>
            <th>{t('diffFromMin')}</th>
          </tr>
        </thead>
        <tbody>
          {latestPrices.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>{(p.price - minPrice).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {total > 0 && (
        <>
          <h2>{t('marketShare')}</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie dataKey="value" data={shareData} label>
                  {shareData.map((entry, idx) => (
                    <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <h2>{t('priceDivergence')}</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={diffData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="diff" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Layout>
  )
}