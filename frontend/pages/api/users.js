import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const rate = {}
const LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE || '60')
function allow(ip){
  const now = Date.now()
  rate[ip] = (rate[ip]||[]).filter(t=>now - t < 60000)
  if(rate[ip].length >= LIMIT) return false
  rate[ip].push(now)
  return true
}

const filePath = path.join(process.cwd(), 'users.json')

function readData(){
  try{ return JSON.parse(fs.readFileSync(filePath, 'utf-8')) }catch{ return [] }
}

export default async function handler(req,res){
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
  if(!allow(ip)) return res.status(429).json({error:'too_many'})
  const session = await getServerSession(req, res, authOptions)
  if(!session || !session.user) return res.status(401).json({error:'unauthorized'})
  const user = session.user
  if(req.method === 'GET'){
    const data = readData().map(u=>({email:u.email, role:u.role, notify:u.notify}))
    res.status(200).json(data)
  }else{
    res.status(405).end()
  }
}