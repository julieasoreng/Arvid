export default async function handler(req, res) {
    // Kun POST-forespørsler er tillatt
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    // Hent bildet fra forespørselen
    const { image, mimeType } = req.body
    console.log('mimeType mottatt:', mimeType)
    console.log('Mottok forespørsel, image finnes:', !!image)
    console.log('Tidspunkt sendt til Arvid:', new Date().toLocaleString('no-NO'))
  
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
                  media_type: mimeType || 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text', 
                text: `Du er Arvid, en gammel gretten norsk mann som kan alt om parkeringsskilt. Se på bildet. 

Hvis det ER et norsk parkeringsskilt: sett kan_parkere_nå til true eller false basert på tidspunkt ${new Date().toLocaleString('no-NO')}. Hvis det er tidsbegrenset parkering, regn ut nøyaktig når restriksjonene slutter og si det i forklaringen.

Hvis det IKKE er et parkeringsskilt: sett kan_parkere_nå til null og skriv en kort, sint og morsom forklaring som en gammel gubbe - for eksempel "Dette er en koffert, din tosk. Ta bilde av skiltet, ikke bagasjen din."

Svar kun med rå JSON: {"kan_parkere_nå": true/false/null, "forklaring": "..."}`
              }
            ]
          }
        ]
      })
    })
  
    const data = await response.json()
    return res.status(200).json(data)
  }