export default async function handler(req, res) {
    // Kun POST-forespørsler er tillatt
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    // Hent bildet fra forespørselen
    const { image } = req.body
  
    // Send bildet til Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text',
                text: `Dette er et norsk parkeringsskilt. Bruk tidspunkt ${new Date().toLocaleString('no-NO')}. Svar kun med rå JSON, ingen markdown. Feltene: kan_parkere_nå (true/false), forklaring (kort setning på norsk).`
              }
            ]
          }
        ]
      })
    })
  
    const data = await response.json()
    return res.status(200).json(data)
  }