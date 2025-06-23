import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'

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
const filePath = path.join(process.cwd(), 'pending_prices.json')
const ecPath = path.join(process.cwd(), 'ec_prices.json')
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
  } catch {
    return []
  }
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function readEc() {
  try {
    return JSON.parse(fs.readFileSync(ecPath, 'utf-8'))
  } catch {
    return {}
  }
}

function writeEc(data) {
  fs.writeFileSync(ecPath, JSON.stringify(data, null, 2))
}

export default async function handler(req, res) {
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
  let data = readData()
  if (req.method === 'GET') {
    res.status(200).json(data)
  } else if (req.method === 'POST') {
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' })
      return
    }
    const { id } = req.body || {}
    const idx = data.findIndex(p => p.id === id)
    if (idx === -1) {
      res.status(404).json({ error: 'notfound' })
      return
    }
    const item = data[idx]
    if (process.env.EC_API_URL && process.env.EC_API_TOKEN) {
      try {
        await fetch(`${process.env.EC_API_URL}/products/${item.ecId}/price`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.EC_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ price: item.newPrice })
        })
      } catch (e) {
        console.error('update error', e)
      }
    }
    const ec = readEc()
    ec[item.ecId] = item.newPrice
    writeEc(ec)
    data.splice(idx, 1)
    writeData(data)
    logOperation(user.email, `approve price ${item.name}`)
    res.status(200).json(data)
  } else {
    res.status(405).end()
  }
}