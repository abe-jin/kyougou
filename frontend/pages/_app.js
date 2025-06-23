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
          <link
            href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.4/dist/tailwind.min.css"
            rel="stylesheet"
          />
        </Head>
        <Toaster position="top-right" />
        <Component {...pageProps} />
      </LangProvider>
    </SessionProvider>
  )
}