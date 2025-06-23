import '../styles.css'
import { LangProvider } from '../i18n'
import { SessionProvider } from 'next-auth/react'

export default function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <LangProvider>
        <Component {...pageProps} />
      </LangProvider>
    </SessionProvider>
  )
}