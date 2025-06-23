import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'

const rate = {}
const LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE || '60')
function allow(ip) {
  const now = Date.now()
  rate[ip] = (rate[ip] || []).filter(t => now - t < 60000)
  if (rate[ip].length >= LIMIT) return false
  rate[ip].push(now)
  return true
}

function sanitize(str) {
  return String(str || '').replace(/[<>"'`]/g, '')
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const filePath = path.join(process.cwd(), 'reports.json')
const logPath = path.join(process.cwd(), '..', 'operation.log')

function logOperation(user, action) {
  const entry = { time: new Date().toISOString(), user, action }
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n')
  } catch (e) {
    console.error('log error', e)
  }
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (e) {
    return []
  }
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
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

  const data = readData()

  if (req.method === 'GET') {
    res.status(200).json(data)
  } else if (req.method === 'POST') {
    const { id, comment, approve } = req.body || {}
    const idx = data.findIndex(r => r.id === id)
    if (idx === -1) {
      res.status(404).json({ error: 'notfound' })
      return
    }
    if (comment) {
      data[idx].comments.push({ user: user.email, text: sanitize(comment), time: new Date().toISOString() })
      logOperation(user.email, `comment report ${id}`)
    }
    if (approve) {
      data[idx].approvals.push({ user: user.email, time: new Date().toISOString() })
      logOperation(user.email, `approve report ${id}`)
    }
    writeData(data)
    res.status(200).json(data[idx])
  } else {
    res.status(405).end()
  }
}