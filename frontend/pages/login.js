import { useState, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.handleGoogle = async (response) => {
      const res = await fetch('http://localhost:5000/api/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.token)
        setMsg('Logged in')
      } else {
        setMsg('OAuth error')
      }
    }
  }, [])

  const handleLogin = async () => {
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (res.ok) {
      localStorage.setItem('token', data.token)
      setMsg('Logged in')
    } else {
      setMsg(data.error || 'Error')
    }
  }

  return (
    <div>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login</title>
      </Head>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <h1>Login</h1>
      <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      <div id="g_id_onload"
        data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        data-callback="handleGoogle"
        style={{ marginTop: '1em' }}></div>
      <div className="g_id_signin" data-type="standard"></div>
      <p>{msg}</p>
    </div>
  )
}