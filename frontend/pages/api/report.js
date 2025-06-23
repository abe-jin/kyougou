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
const reportsPath = path.join(process.cwd(), 'reports.json')
const logPath = path.join(process.cwd(), '..', 'operation.log')

function logOperation(user, action) {
  const entry = { time: new Date().toISOString(), user, action }
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n')
  } catch (e) {
    console.error('log error', e)
  }
}

function readReports() {
  try {
    return JSON.parse(fs.readFileSync(reportsPath, 'utf-8'))
  } catch {
    return []
  }
}

function writeReports(data) {
  fs.writeFileSync(reportsPath, JSON.stringify(data, null, 2))
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
  const { period, category } = req.body || {}
  const script = path.join(process.cwd(), '..', 'scraping', 'summary_report.py')
  const args = []
  if (period) {
    args.push('--period', period)
  }
  if (category) {
    args.push('--category', category)
  }
  const id = Date.now()
  execFile('python', [script, ...args], (err) => {
    if (err) {
      console.error(err)
      res.status(500).json({ error: 'failed' })
    } else {
      const src = path.join(process.cwd(), 'summary_report.xlsx')
      const dst = path.join(process.cwd(), `report_${id}.xlsx`)
      try {
        if (fs.existsSync(src)) fs.renameSync(src, dst)
      } catch (e) {
        console.error('rename error', e)
      }
      const list = readReports()
      list.push({ id, time: new Date().toISOString(), period: period || 'month', category: category || '', file: `report_${id}.xlsx`, comments: [], approvals: [] })
      writeReports(list)
      logOperation(user.email, `generate report ${id}`)
      res.status(200).json({ status: 'ok' })
    }
  })
}