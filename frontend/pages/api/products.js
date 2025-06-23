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

function sanitize(str) {
  return String(str).replace(/[<>"'`]/g, '')
}


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

function readData() {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    return []
  }
}

function writeData(data) {
  try {
    const current = fs.readFileSync(filePath, 'utf-8')
    fs.writeFileSync(backupPath, current)
  } catch (e) {
    // ignore if no previous file
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
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

  let data = readData()
  if (req.method === 'GET') {
    res.status(200).json(data)
  } else if (req.method === 'POST') {
    const product = {
      ...req.body,
      name: sanitize(req.body.name),
      url: sanitize(req.body.url),
      nameSelector: sanitize(req.body.nameSelector || ''),
      priceSelector: sanitize(req.body.priceSelector || ''),
      reviewSelector: sanitize(req.body.reviewSelector || ''),
      ratingSelector: sanitize(req.body.ratingSelector || ''),
      rankSelector: sanitize(req.body.rankSelector || ''),
      trendSelector: sanitize(req.body.trendSelector || ''),
      category: sanitize(req.body.category || ''),
      notify: sanitize(req.body.notify || '')
    }
    if (user.role !== 'admin') {
      product.owner = user.email
    }
    if (user.role === 'admin' && req.body.owner) {
      product.owner = sanitize(req.body.owner)
    }
    data.push(product)
    logOperation(user.email, `add ${product.name}`);
    writeData(data);
    res.status(200).json(data);
  } else if (req.method === 'PUT') {
    const { index, product: bodyProd } = req.body;
    const product = {
      ...bodyProd,
      name: sanitize(bodyProd.name),
      url: sanitize(bodyProd.url),
      nameSelector: sanitize(bodyProd.nameSelector || ''),
      priceSelector: sanitize(bodyProd.priceSelector || ''),
      reviewSelector: sanitize(bodyProd.reviewSelector || ''),
      ratingSelector: sanitize(bodyProd.ratingSelector || ''),
      rankSelector: sanitize(bodyProd.rankSelector || ''),
      trendSelector: sanitize(bodyProd.trendSelector || ''),
      category: sanitize(bodyProd.category || ''),
      notify: sanitize(bodyProd.notify || '')
    };
    if (data[index]) {
      if (user.role !== 'admin' && data[index].owner !== user.email) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      if (user.role === 'admin') {
        product.owner = sanitize(bodyProd.owner || data[index].owner);
      } else {
        product.owner = data[index].owner;
      }
      data[index] = product;
      logOperation(user.email, `edit ${product.name}`);
      writeData(data);
    }
    res.status(200).json(data);
  } else if (req.method === 'DELETE') {
    const { index } = req.body;
    if (index >= 0 && index < data.length) {
      if (user.role !== 'admin' && data[index].owner !== user.email) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const name = data[index].name;
      data.splice(index, 1);
      logOperation(user.email, `delete ${name}`);
      writeData(data);
    }
    res.status(200).json(data);
  } else {
    res.status(405).end();
  }
}