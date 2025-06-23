import { useState, useContext, useEffect } from 'react'
import Link from 'next/link'
import { LangContext } from '../i18n'
import { Sun, Moon } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <div className="font-bold">Kyougou</div>
        <nav className="space-x-4">
          <Link href="/">{t('dashboard')}</Link>
          <Link href="/manage">{t('manageMenu')}</Link>
          <Link href="/compare">{t('compare')}</Link>
          <Link href="/help">{t('help')}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <input className="border px-2 py-1" placeholder={t('searchPlaceholder')} />
          <button onClick={() => setDark(!dark)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <select className="text-black" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">EN</option>
            <option value="ja">JA</option>
          </select>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-48 bg-gray-100 p-4 dark:bg-gray-900">
          <ul>
            <li><Link href="/">{t('dashboard')}</Link></li>
            <li><Link href="/manage">{t('manageMenu')}</Link></li>
            <li><Link href="/compare">{t('compare')}</Link></li>
            <li><Link href="/help">{t('help')}</Link></li>
          </ul>
        </aside>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  )
}