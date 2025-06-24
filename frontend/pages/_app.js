import '../styles.css'
import { LangProvider } from '../i18n'
import { SessionProvider } from 'next-auth/react'
import Head from 'next/head'
import { Toaster } from 'react-hot-toast'

export default function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <LangProvider>
        <Head>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <meta property="og:title" content="Kyougou" />
          <meta property="og:type" content="website" />
          <script src="https://cdn.tailwindcss.com"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `tailwind.config = {
  theme: {
    extend: {
      colors: { primary: '#1e3a8a', secondary: '#f59e0b' },
      fontFamily: { sans: ['Inter','sans-serif'] },
      borderRadius: { lg: '0.5rem' },
      boxShadow: { card: '0 2px 4px rgba(0,0,0,0.1)' }
    }
  }
}`
            }}
          />
        </Head>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Component {...pageProps} />
      </LangProvider>
    </SessionProvider>
  )
}