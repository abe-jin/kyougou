import Link from 'next/link'
import { useRouter } from 'next/router'
import { useContext } from 'react'
import { LangContext } from '../i18n'
import { Home, Settings, BarChart, HelpCircle } from 'lucide-react'

export default function Sidebar({ open, onClose }) {
  const { t } = useContext(LangContext)
  const router = useRouter()
  const items = [
    { href: '/', icon: <Home size={16} />, label: t('dashboard') },
    { href: '/manage', icon: <Settings size={16} />, label: t('manageMenu') },
    { href: '/compare', icon: <BarChart size={16} />, label: t('compare') },
    { href: '/help', icon: <HelpCircle size={16} />, label: t('help') }
  ]
  return (
    <aside
      className={`w-60 bg-gray-100 dark:bg-gray-900 shadow-card transform transition-transform duration-200 absolute h-full z-10 md:relative md:translate-x-0 md:z-0 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      role="navigation"
      aria-label="Sidebar"
    >
      <ul className="space-y-2 sidebar-list">
        {items.map((it) => (
          <li key={it.href} className={router.pathname===it.href?'active':''}>
            <Link href={it.href} className="flex items-center gap-2" onClick={onClose}>
              {it.icon} {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
