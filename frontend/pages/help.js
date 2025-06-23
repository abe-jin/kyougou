import { useState, useContext } from 'react'
import Head from 'next/head'
import { LangContext } from '../i18n'
import Layout from '../components/Layout'

export default function Help() {
  const { lang, setLang, t } = useContext(LangContext)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const send = async () => {
    if (!input) return
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    })
    const data = await res.json()
    setMessages((m) => [...m, { role: 'user', content: input }, { role: 'bot', content: data.reply }])
    setInput('')
  }

  return (
    <Layout>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t('helpTitle')}</title>
      </Head>
      <div style={{ textAlign: 'right' }}>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
      <h1>{t('helpTitle')}</h1>
      <div style={{ maxWidth: 600 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <p><b>{m.role === 'user' ? t('you') : 'Bot'}:</b> {m.content}</p>
          </div>
        ))}
      </div>
      <input
        style={{ width: '80%' }}
        value={input}
        placeholder={t('askQuestion')}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send()
        }}
      />
      <button onClick={send}>{t('send')}</button>
    </Layout>
  )
}