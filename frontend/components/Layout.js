import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children, onSearch }) {
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      setDark(true)
    }
  }, [])

  useEffect(() => {
    const start = () => setRouteLoading(true)
    const end = () => setRouteLoading(false)
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', end)
    router.events.on('routeChangeError', end)
    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', end)
      router.events.off('routeChangeError', end)
    }
  }, [router])

  useEffect(() => {
    document.body.className = dark ? 'dark' : ''
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {routeLoading && <div className="progress-bar" aria-hidden="true" />}
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} dark={dark} setDark={setDark} onSearch={onSearch} />
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
      <div className="flex flex-1 relative">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="flex-1 p-4">{children}</main>
      </div>
      <footer className="text-center py-2 text-sm bg-gray-50 dark:bg-gray-800">
        &copy; 2024 Kyougou
      </footer>
    </div>
  )
}