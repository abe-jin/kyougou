import 'dotenv/config'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import jwt from 'jsonwebtoken'

const rate = {}
const LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE || '60')
function allow(ip) {
  const now = Date.now()
  rate[ip] = (rate[ip] || []).filter((t) => now - t < 60000)
  if (rate[ip].length >= LIMIT) return false
  rate[ip].push(now)
  return true
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
  if (!allow(ip)) {
    res.status(429).json({ error: 'too_many' })
    return
  }
  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ', '')
  try {
    jwt.verify(token, JWT_SECRET)
  } catch (e) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const { url, nameSelector, priceSelector } = req.body || {}
  if (!url) {
    res.status(400).json({ error: 'missing' })
    return
  }
  try {
    const r = await fetch(url)
    const html = await r.text()
    const $ = cheerio.load(html)
    const name = $(nameSelector || 'h1').first().text().trim()
    const priceText = $(priceSelector || 'span.price').first().text()
    const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10)
    res.status(200).json({ name, price: isNaN(price) ? null : price })
  } catch (e) {
    res.status(500).json({ error: 'failed' })
  }
}