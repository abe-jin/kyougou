import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'

const rate = {}
const LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE || '60')
function allow(ip){
  const now = Date.now()
  rate[ip]=(rate[ip]||[]).filter(t=>now-t<60000)
  if(rate[ip].length>=LIMIT) return false
  rate[ip].push(now)
  return true
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const filePath = path.join(process.cwd(), 'frontend', 'templates.json')

function readData(){
  try{ return JSON.parse(fs.readFileSync(filePath,'utf-8')) }catch{ return [] }
}

export default function handler(req,res){
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
  if(!allow(ip)) return res.status(429).json({error:'too_many'})
  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ','')
  try{ jwt.verify(token, JWT_SECRET) }catch(e){ return res.status(401).json({error:'unauthorized'}) }

  if(req.method==='GET'){
    const data = readData()
    res.status(200).json(data)
  } else {
    res.status(405).end()
  }
}