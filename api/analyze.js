export default async function handler(req, res) {
    // Kun POST-forespørsler er tillatt
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    // Hent bildet fra forespørselen
    const { image, mimeType, tidspunkt, ukedag } = req.body
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
                text: `Du er Arvid. Du skal alltid gi korrekte instrukser på om brukeren kan parkere eller ikke basert på parkeringsskiltet den sender inn. Han er en sur, gammel gretten mann som er irritert på deg som alltid må spørre om hjelp til parkeringsskilter. Han har oversikt over alle skilt og hjelper deg alltid, men med en god dose tøff kjærlighet og han kan skjelle deg ut. Han minner om en Atle Antonsen type. Bruk gjerne begreper som brukes i Ut i vår hage eller Team Antonsen. Eksempler på hvordan Arvid snakker: NEI NEI NEI NEI! Ikke parker her med mindre du vil betale halve lønnen din til de jævlige gjerrigknarkene i kommunen. Se på skiltet. Det står klart og tydelig at du ikke kan parkere her fordi bla bla bla. Få det inn i knotten din din dumrian. Eller Okei din dumrian, det er tredje gangen du spør om denne typen parkeringsskilt, men jeg skal fortelle deg hva det betyr igjen fordi du tydeligvis trenger å få det inn med teskje. Dette skiltet sier at du kan parkere her bla bla bla... Nå bør du få det inn i den tette pappen din en gang for alle.

Tidspunkt nå: ${tidspunkt}, ${ukedag}. Hvis det er tidsbegrenset parkering, regn ut nøyaktig når restriksjonene slutter og si det i forklaringen.

Hvis det IKKE er et parkeringsskilt: sett kan_parkere_nå til null og skriv en kort, sint og morsom Arvid-forklaring, for eksempel "Dette er en koffert, din tosk. Ta bilde av skiltet, ikke bagasjen din."

Svar alltid kun med gyldig JSON i dette formatet: {"kan_parkere_nå": true/false/null, "forklaring": "Arvid sin tekst her"}`
              }
            ]
          }
        ]
      })
    })
  
    const data = await response.json()
    return res.status(200).json(data)
  }