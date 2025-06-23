import 'dotenv/config'
import path from 'path'
import { execFile } from 'child_process'
import jwt from 'jsonwebtoken'
import fs from 'fs'

const rate = {}
const LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE || '60')
function allow(ip) {
  const now = Date.now()
  rate[ip] = (rate[ip] || []).filter(t => now - t < 60000)
  if (rate[ip].length >= LIMIT) return false
  rate[ip].push(now)
  return true
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const filePath = path.join(process.cwd(), 'products.json')

function readData() {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    return []
  }
}

export default function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
  if (!allow(ip)) {
    res.status(429).json({ error: 'too_many' })
    return
  }
  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ', '')
  let user
  try {
    user = jwt.verify(token, JWT_SECRET)
  } catch (e) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const { index } = req.body || {}
  const data = readData()
  if (index < 0 || index >= data.length) {
    res.status(400).json({ error: 'invalid' })
    return
  }
  const prod = data[index]
  if (user.role !== 'admin' && prod.owner !== user.email) {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  const script = path.join(process.cwd(), '..', 'scraping', 'manual_scrape.py')
  execFile('python', [script, '--index', String(index)], (err, stdout, stderr) => {
    if (err) {
      console.error(err)
      res.status(500).json({ error: 'failed' })
    } else {
      res.status(200).json({ status: 'ok' })
    }
  })
}