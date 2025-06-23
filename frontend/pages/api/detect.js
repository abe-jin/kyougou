import 'dotenv/config'
import fetch from 'node-fetch'
import cheerio from 'cheerio'

export default async function handler(req, res) {
  const { url } = req.method === 'POST' ? req.body : req.query
  if (!url) {
    res.status(400).json({ error: 'missing' })
    return
  }
  try {
    const r = await fetch(url)
    const html = await r.text()
    const $ = cheerio.load(html)
    // guess price selector
    let priceSel = 'span.price'
    let cand = $('*[class*=price]').first()
    if (!cand.length) {
      cand = $('*:contains("¥")').first()
    }
    if (cand.length) {
      const tag = cand.get(0).tagName
      const cls = (cand.attr('class') || '').split(' ')[0]
      priceSel = cls ? `${tag}.${cls}` : tag
    }
    let nameSel = 'h1'
    let nameCand = $('h1').first()
    if (!nameCand.length) {
      nameCand = $('title').first()
    }
    if (nameCand.length) {
      const tag = nameCand.get(0).tagName
      const cls = (nameCand.attr('class') || '').split(' ')[0]
      nameSel = cls ? `${tag}.${cls}` : tag
    }
    res.status(200).json({ priceSelector: priceSel, nameSelector: nameSel })
  } catch (e) {
    res.status(500).json({ error: 'failed' })
  }
}