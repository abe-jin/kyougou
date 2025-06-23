import { useState, useContext, useEffect } from 'react'
import Link from 'next/link'
import { LangContext } from '../i18n'

export default function Layout({ children }) {
  const { lang, setLang, t } = useContext(LangContext)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      setDark(true)
    }
  }, [])

  useEffect(() => {
    document.body.className = dark ? 'dark' : ''
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">Kyougou</div>
        <nav className="nav">
          <Link href="/">{t('dashboard')}</Link>
          <Link href="/manage">{t('manageMenu')}</Link>
          <Link href="/compare">{t('compare')}</Link>
          <Link href="/help">{t('help')}</Link>
        </nav>
        <div className="tools">
          <input placeholder={t('searchPlaceholder')} />
          <button onClick={() => setDark(!dark)}>{dark ? '☀' : '🌙'}</button>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">EN</option>
            <option value="ja">JA</option>
          </select>
        </div>
      </header>
      <div className="content">
        <aside className="sidebar">
          <ul>
            <li><Link href="/">{t('dashboard')}</Link></li>
            <li><Link href="/manage">{t('manageMenu')}</Link></li>
            <li><Link href="/compare">{t('compare')}</Link></li>
            <li><Link href="/help">{t('help')}</Link></li>
          </ul>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  )
}