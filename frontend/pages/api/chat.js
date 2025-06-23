import 'dotenv/config'
import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }
  const { message } = req.body || {}
  if (!message) {
    res.status(400).json({ error: 'no_message' })
    return
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(200).json({ reply: `AI unavailable. You asked: ${message}` })
    return
  }
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant answering questions about the price monitoring dashboard.'
          },
          { role: 'user', content: message }
        ]
      })
    })
    const data = await r.json()
    const reply = data.choices?.[0]?.message?.content || 'Sorry, no answer.'
    res.status(200).json({ reply })
  } catch (e) {
    res.status(500).json({ error: 'failed' })
  }
}