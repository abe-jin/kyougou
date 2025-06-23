import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

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
const filePath = path.join(process.cwd(), 'products.json')
const backupPath = path.join(process.cwd(), 'products_prev.json')
const logPath = path.join(process.cwd(), '..', 'operation.log')

function logOperation(user, action) {
  const entry = { time: new Date().toISOString(), user, action }
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n')
  } catch (e) {
    console.error('log error', e)
  }
}

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
  if (!allow(ip)) {
    res.status(429).json({ error: 'too_many' })
    return
  }
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
    const user = session.user
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  try {
    const prev = fs.readFileSync(backupPath, 'utf-8')
    fs.writeFileSync(filePath, prev)
    logOperation(user.email, 'rollback products')
    const data = JSON.parse(prev)
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: 'failed' })
  }
}