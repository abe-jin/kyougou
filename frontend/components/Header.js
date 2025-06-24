import { useContext } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { LangContext } from '../i18n'
import { Sun, Moon, Menu, X, Bell, User } from 'lucide-react'
import Button from './ui/Button'

export default function Header({ menuOpen, setMenuOpen, dark, setDark, onSearch }) {
  const { lang, setLang, t } = useContext(LangContext)
  const router = useRouter()
  const navItems = [
    { href: '/', label: t('dashboard') },
    { href: '/manage', label: t('manageMenu') },
    { href: '/compare', label: t('compare') },
    { href: '/help', label: t('help') }
  ]
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-primary text-white shadow-card">
      <div className="flex items-center gap-2">
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="font-semibold text-lg">Kyougou</span>
      </div>
      <nav className="hidden md:flex gap-4" role="navigation" aria-label="Main">
        {navItems.map((n) => (
          <Link key={n.href} href={n.href} className={`${router.pathname===n.href?'font-bold bg-white text-primary rounded px-2':'hover:underline'}`}>{n.label}</Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <input
          className="border px-2 py-1 rounded-lg text-black"
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          onChange={(e)=>onSearch&&onSearch(e.target.value)}
          onKeyDown={(e)=>e.key==='Enter'&&onSearch&&onSearch(e.target.value)}
        />
        <Button onClick={() => setDark(!dark)} className="p-1" aria-label="Toggle dark mode">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        <select className="text-black rounded-lg" value={lang} onChange={(e)=>setLang(e.target.value)} aria-label="Language">
          <option value="en">EN</option>
          <option value="ja">JA</option>
        </select>
        <Bell className="ml-2" aria-label="Notifications" />
        <User className="ml-2" aria-label="Account" />
      </div>
    </header>
  )
}
