import '../styles.css'
import { LangProvider } from '../i18n'

export default function MyApp({ Component, pageProps }) {
  return (
    <LangProvider>
      <Component {...pageProps} />
    </LangProvider>
  )
}